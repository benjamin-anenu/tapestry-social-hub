import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLANA_RPC = "https://api.devnet.solana.com";

function encodeLittleEndian(value: bigint, bytes: number): Uint8Array {
  const result = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    result[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return result;
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function fromBase58(str: string): Uint8Array {
  const bytes: number[] = [];
  for (const c of str) {
    let carry = BASE58_ALPHABET.indexOf(c);
    if (carry < 0) throw new Error("Invalid base58 character");
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const c of str) {
    if (c === "1") bytes.push(0);
    else break;
  }
  return new Uint8Array(bytes.reverse());
}

async function sendPayout(winnerAddress: string, lamports: number): Promise<string | null> {
  const escrowKeyJson = Deno.env.get("ESCROW_WALLET_PRIVATE_KEY");
  if (!escrowKeyJson) throw new Error("Escrow not configured");
  const secretKeyArray: number[] = JSON.parse(escrowKeyJson);
  const escrowKeypair = new Uint8Array(secretKeyArray);
  const escrowPubkeyBytes = escrowKeypair.slice(32, 64);
  const winnerPubkeyBytes = fromBase58(winnerAddress);

  const bhResponse = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "getLatestBlockhash",
      params: [{ commitment: "finalized" }],
    }),
  });
  const bhData = await bhResponse.json();
  const blockhashBytes = fromBase58(bhData.result.value.blockhash);

  const SYSTEM_PROGRAM = new Uint8Array(32);
  const accountKeys = new Uint8Array(32 * 3);
  accountKeys.set(escrowPubkeyBytes, 0);
  accountKeys.set(winnerPubkeyBytes, 32);
  accountKeys.set(SYSTEM_PROGRAM, 64);

  const transferData = new Uint8Array(12);
  transferData.set([2, 0, 0, 0], 0);
  transferData.set(encodeLittleEndian(BigInt(lamports), 8), 4);

  const message = new Uint8Array(3 + 1 + 32 * 3 + 32 + 1 + 1 + 1 + 2 + 1 + 12);
  let offset = 0;
  message[offset++] = 1; message[offset++] = 0; message[offset++] = 1;
  message[offset++] = 3;
  message.set(accountKeys, offset); offset += 96;
  message.set(blockhashBytes, offset); offset += 32;
  message[offset++] = 1; message[offset++] = 2; message[offset++] = 2;
  message[offset++] = 0; message[offset++] = 1; message[offset++] = 12;
  message.set(transferData, offset);

  // Wrap 32-byte Ed25519 seed in PKCS8 DER for crypto.subtle
  const pkcs8Header = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8Key = new Uint8Array(pkcs8Header.length + 32);
  pkcs8Key.set(pkcs8Header, 0);
  pkcs8Key.set(escrowKeypair.slice(0, 32), pkcs8Header.length);
  const cryptoKey = await crypto.subtle.importKey("pkcs8", pkcs8Key, { name: "Ed25519" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", cryptoKey, message));

  const fullTx = new Uint8Array(1 + 64 + message.length);
  fullTx[0] = 1; fullTx.set(signature, 1); fullTx.set(message, 65);
  const txBase64 = btoa(String.fromCharCode(...fullTx));

  const sendResponse = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "sendTransaction",
      params: [txBase64, { encoding: "base64", preflightCommitment: "confirmed" }],
    }),
  });
  const sendData = await sendResponse.json();
  if (sendData.error) {
    console.error("Payout tx error:", sendData.error);
    return null;
  }
  return sendData.result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { gameId, walletAddress, autoFinish } = await req.json();
    if (!gameId || !walletAddress) throw new Error("gameId and walletAddress required");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();
    if (!profile) throw new Error("Profile not found");

    // autoFinish: called by chicken-tick when trading battle ends
    if (autoFinish) {
      // Fetch game without filtering by status/winner to avoid race condition
      let game = null;
      {
        const { data } = await supabase
          .from("chicken_games")
          .select("*")
          .eq("id", gameId)
          .single();
        game = data;
      }

      // If game hasn't propagated to "finished" yet, retry once after 500ms
      if (game && game.status !== "finished") {
        await new Promise((r) => setTimeout(r, 500));
        const { data } = await supabase
          .from("chicken_games")
          .select("*")
          .eq("id", gameId)
          .single();
        game = data;
      }

      if (!game || game.status !== "finished" || game.winner_id !== profile.id) {
        const reason = !game ? "Game not found" : game.status !== "finished" ? `Game status is ${game.status}` : "You are not the winner";
        return new Response(
          JSON.stringify({ error: reason }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const potTotal = Number(game.stake_amount) * 2;
      const fee = potTotal * 0.1;
      const payout = potTotal - fee;
      const payoutLamports = Math.round(payout * 1_000_000_000);

      await supabase.from("chicken_games").update({ platform_fee: fee }).eq("id", gameId);

      let payoutTx = null;
      try {
        payoutTx = await sendPayout(walletAddress, payoutLamports);
        if (payoutTx) {
          await supabase.from("chicken_games").update({ payout_tx: payoutTx, payout_error: null }).eq("id", gameId);
        } else {
          await supabase.from("chicken_games").update({ payout_error: "sendPayout returned null (tx rejected)" }).eq("id", gameId);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error("Auto payout failed:", errMsg);
        await supabase.from("chicken_games").update({ payout_error: errMsg }).eq("id", gameId);
      }

      return new Response(
        JSON.stringify({ success: true, winner: true, payout, payoutTx }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Legacy cashout (compatibility)
    const { data: game, error: gameErr } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("id", gameId)
      .eq("status", "active")
      .is("cashed_out_by", null)
      .single();

    if (gameErr || !game) {
      const { data: finishedGame } = await supabase
        .from("chicken_games").select("*").eq("id", gameId).single();
      if (finishedGame?.cashed_out_by) {
        return new Response(
          JSON.stringify({ error: "Opponent already cashed out!", winner_id: finishedGame.cashed_out_by, status: "finished" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Game not found or not active");
    }

    const isPlayerA = game.player_a_id === profile.id;
    const isPlayerB = game.player_b_id === profile.id;
    if (!isPlayerA && !isPlayerB) throw new Error("You are not in this game");

    const potTotal = Number(game.stake_amount) * 2;
    const fee = potTotal * 0.1;
    const payout = potTotal - fee;
    const payoutLamports = Math.round(payout * 1_000_000_000);

    const { data: updated, error: updateErr } = await supabase
      .from("chicken_games")
      .update({
        cashed_out_by: profile.id, cashed_out_at: game.counter,
        winner_id: profile.id, status: "finished",
        ended_at: new Date().toISOString(), platform_fee: fee,
      })
      .eq("id", gameId).eq("status", "active").is("cashed_out_by", null)
      .select().single();

    if (updateErr || !updated) {
      return new Response(
        JSON.stringify({ error: "Someone else cashed out first!" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payoutTx = null;
    try {
      payoutTx = await sendPayout(walletAddress, payoutLamports);
      if (payoutTx) {
        await supabase.from("chicken_games").update({ payout_tx: payoutTx, payout_error: null }).eq("id", gameId);
      } else {
        await supabase.from("chicken_games").update({ payout_error: "sendPayout returned null (tx rejected)" }).eq("id", gameId);
      }
    } catch (payoutError) {
      const errMsg = payoutError instanceof Error ? payoutError.message : String(payoutError);
      console.error("Payout failed:", errMsg);
      await supabase.from("chicken_games").update({ payout_error: errMsg }).eq("id", gameId);
    }

    return new Response(
      JSON.stringify({ success: true, winner: true, payout, payoutTx, cashedOutAt: game.counter }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chicken-cashout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
