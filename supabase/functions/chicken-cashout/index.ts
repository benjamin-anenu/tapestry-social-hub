import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLANA_RPC = "https://api.devnet.solana.com";

// Minimal Solana transaction building helpers
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

function toBase58(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) str += "1";
  for (let i = digits.length - 1; i >= 0; i--) str += BASE58_ALPHABET[digits[i]];
  return str;
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

    const { gameId, walletAddress } = await req.json();
    if (!gameId || !walletAddress) throw new Error("gameId and walletAddress required");

    // Get player profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();
    if (!profile) throw new Error("Profile not found");

    // Get game with optimistic lock on status=active and no cashed_out_by
    const { data: game, error: gameErr } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("id", gameId)
      .eq("status", "active")
      .is("cashed_out_by", null)
      .single();

    if (gameErr || !game) {
      // Check if someone already cashed out
      const { data: finishedGame } = await supabase
        .from("chicken_games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (finishedGame?.cashed_out_by) {
        return new Response(
          JSON.stringify({
            error: "Opponent already cashed out!",
            winner_id: finishedGame.cashed_out_by,
            status: "finished",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Game not found or not active");
    }

    const isPlayerA = game.player_a_id === profile.id;
    const isPlayerB = game.player_b_id === profile.id;
    if (!isPlayerA && !isPlayerB) throw new Error("You are not in this game");

    // RACE CONDITION PROTECTION: Update with WHERE cashed_out_by IS NULL
    const potTotal = Number(game.stake_amount) * 2;
    const fee = potTotal * 0.1;
    const payout = potTotal - fee;
    const payoutLamports = Math.round(payout * 1_000_000_000);

    const { data: updated, error: updateErr } = await supabase
      .from("chicken_games")
      .update({
        cashed_out_by: profile.id,
        cashed_out_at: game.counter,
        winner_id: profile.id,
        status: "finished",
        ended_at: new Date().toISOString(),
        platform_fee: fee,
      })
      .eq("id", gameId)
      .eq("status", "active")
      .is("cashed_out_by", null)
      .select()
      .single();

    if (updateErr || !updated) {
      return new Response(
        JSON.stringify({ error: "Someone else cashed out first!" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now send the payout from escrow to winner
    let payoutTx = null;
    try {
      const escrowKeyJson = Deno.env.get("ESCROW_WALLET_PRIVATE_KEY");
      if (!escrowKeyJson) throw new Error("Escrow not configured");
      const secretKeyArray: number[] = JSON.parse(escrowKeyJson);
      const escrowKeypair = new Uint8Array(secretKeyArray);
      const escrowPubkeyBytes = escrowKeypair.slice(32, 64);
      const winnerPubkeyBytes = fromBase58(walletAddress);

      // Get recent blockhash
      const bhResponse = await fetch(SOLANA_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getLatestBlockhash",
          params: [{ commitment: "finalized" }],
        }),
      });
      const bhData = await bhResponse.json();
      const blockhash = bhData.result.value.blockhash;
      const blockhashBytes = fromBase58(blockhash);

      // Build a raw transfer transaction
      // SystemProgram.transfer instruction (program index 2 = system program)
      const SYSTEM_PROGRAM = new Uint8Array(32); // all zeros

      // Compact array of 1 signature (placeholder)
      // Message: header, account keys, recent blockhash, instructions
      const numRequiredSignatures = 1;
      const numReadonlySignedAccounts = 0;
      const numReadonlyUnsignedAccounts = 1;

      // Account keys: [escrow (signer+writable), winner (writable), system program (readonly)]
      const accountKeys = new Uint8Array(32 * 3);
      accountKeys.set(escrowPubkeyBytes, 0);
      accountKeys.set(winnerPubkeyBytes, 32);
      accountKeys.set(SYSTEM_PROGRAM, 64);

      // Instruction: transfer
      // program_id_index: 2 (system program)
      // accounts: [0 (escrow, signer+writable), 1 (winner, writable)]
      // data: [2, 0, 0, 0] (transfer instruction index) + little-endian u64 lamports
      const transferData = new Uint8Array(12);
      transferData.set([2, 0, 0, 0], 0);
      transferData.set(encodeLittleEndian(BigInt(payoutLamports), 8), 4);

      // Build message
      const message = new Uint8Array(
        3 + // header
        1 + // num account keys (compact u16 as 1 byte since < 128)
        32 * 3 + // account keys
        32 + // recent blockhash
        1 + // num instructions
        1 + // program id index
        1 + // num accounts in instruction (compact)
        2 + // account indices
        1 + // data length (compact)
        12 // instruction data
      );

      let offset = 0;
      message[offset++] = numRequiredSignatures;
      message[offset++] = numReadonlySignedAccounts;
      message[offset++] = numReadonlyUnsignedAccounts;
      message[offset++] = 3; // num account keys
      message.set(accountKeys, offset);
      offset += 32 * 3;
      message.set(blockhashBytes, offset);
      offset += 32;
      message[offset++] = 1; // num instructions
      message[offset++] = 2; // program id index (system program)
      message[offset++] = 2; // num accounts in instruction
      message[offset++] = 0; // escrow index
      message[offset++] = 1; // winner index
      message[offset++] = 12; // data length
      message.set(transferData, offset);

      // Sign with Ed25519
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        escrowKeypair.slice(0, 32),
        { name: "Ed25519" },
        false,
        ["sign"]
      );
      const signature = new Uint8Array(
        await crypto.subtle.sign("Ed25519", cryptoKey, message)
      );

      // Build full transaction: [num_signatures (compact), signature, message]
      const fullTx = new Uint8Array(1 + 64 + message.length);
      fullTx[0] = 1; // 1 signature
      fullTx.set(signature, 1);
      fullTx.set(message, 65);

      // Base64 encode and send
      const txBase64 = btoa(String.fromCharCode(...fullTx));

      const sendResponse = await fetch(SOLANA_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [txBase64, { encoding: "base64", preflightCommitment: "confirmed" }],
        }),
      });

      const sendData = await sendResponse.json();
      if (sendData.error) {
        console.error("Payout tx error:", sendData.error);
      } else {
        payoutTx = sendData.result;
        // Store payout tx
        await supabase
          .from("chicken_games")
          .update({ payout_tx: payoutTx })
          .eq("id", gameId);
      }
    } catch (payoutError) {
      console.error("Payout failed:", payoutError);
      // Game is still marked as finished with winner - payout can be retried manually
    }

    return new Response(
      JSON.stringify({
        success: true,
        winner: true,
        payout: payout,
        payoutTx,
        cashedOutAt: game.counter,
      }),
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
