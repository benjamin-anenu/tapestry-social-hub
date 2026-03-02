import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLANA_RPC = "https://api.devnet.solana.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { gameId, walletAddress, txSignature } = await req.json();

    if (!gameId || !walletAddress || !txSignature) {
      throw new Error("gameId, walletAddress, and txSignature are required");
    }

    // Get the game
    const { data: game, error: gameErr } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameErr || !game) throw new Error("Game not found");
    if (game.status !== "depositing" && game.status !== "waiting") {
      throw new Error("Game is not in deposit phase");
    }

    // Get player profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (!profile) throw new Error("Profile not found");

    const isPlayerA = game.player_a_id === profile.id;
    const isPlayerB = game.player_b_id === profile.id;
    if (!isPlayerA && !isPlayerB) throw new Error("You are not in this game");

    // Verify the transaction on Solana devnet
    const txResponse = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [txSignature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      }),
    });

    const txData = await txResponse.json();
    if (!txData.result) {
      throw new Error("Transaction not found or not confirmed yet. Try again in a few seconds.");
    }

    // Verify the transaction transferred the correct amount to escrow
    const escrowKeyJson = Deno.env.get("ESCROW_WALLET_PRIVATE_KEY");
    if (!escrowKeyJson) throw new Error("Escrow not configured");
    const secretKeyArray: number[] = JSON.parse(escrowKeyJson);
    const publicKeyBytes = new Uint8Array(secretKeyArray.slice(32, 64));

    // Convert escrow public key to base58 for comparison
    const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
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

    const escrowPubkey = toBase58(publicKeyBytes);

    // Check instructions for a transfer to the escrow
    const instructions = txData.result.transaction?.message?.instructions || [];
    const stakeInLamports = Math.round(game.stake_amount * 1_000_000_000);
    let validTransfer = false;

    for (const ix of instructions) {
      if (ix.parsed?.type === "transfer" && ix.program === "system") {
        const info = ix.parsed.info;
        if (
          info.destination === escrowPubkey &&
          info.source === walletAddress &&
          info.lamports >= stakeInLamports
        ) {
          validTransfer = true;
          break;
        }
      }
    }

    if (!validTransfer) {
      throw new Error("Transaction does not contain a valid transfer to the escrow wallet");
    }

    // Update game
    const updateData: Record<string, unknown> = {};
    if (isPlayerA) {
      if (game.player_a_deposited) throw new Error("Already deposited");
      updateData.player_a_deposited = true;
      updateData.player_a_tx = txSignature;
    } else {
      if (game.player_b_deposited) throw new Error("Already deposited");
      updateData.player_b_deposited = true;
      updateData.player_b_tx = txSignature;
    }

    // Check if both deposited
    const bothDeposited =
      (isPlayerA && game.player_b_deposited) ||
      (isPlayerB && game.player_a_deposited);

    if (bothDeposited) {
      updateData.status = "active";
      updateData.started_at = new Date().toISOString();
      updateData.platform_fee = game.stake_amount * 2 * 0.1;
    }

    const { error: updateErr } = await supabase
      .from("chicken_games")
      .update(updateData)
      .eq("id", gameId);

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({
        success: true,
        bothDeposited,
        status: bothDeposited ? "active" : "depositing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chicken-deposit error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
