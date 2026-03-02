import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKeyJson = Deno.env.get("ESCROW_WALLET_PRIVATE_KEY");
    if (!privateKeyJson) {
      throw new Error("Escrow wallet not configured");
    }

    // Parse the private key to derive the public key
    // The secret should be the JSON array format from Keypair.secretKey (64 bytes)
    let secretKeyArray: number[];
    try {
      secretKeyArray = JSON.parse(privateKeyJson);
    } catch {
      // If it's a base58 string, we need to handle differently
      // For now assume JSON array format
      throw new Error("Invalid escrow key format. Expected JSON array of bytes.");
    }

    // The public key is the last 32 bytes of the 64-byte secret key
    const publicKeyBytes = new Uint8Array(secretKeyArray.slice(32, 64));

    // Convert to base58
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

    const escrowPublicKey = toBase58(publicKeyBytes);

    return new Response(
      JSON.stringify({ escrowPublicKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
