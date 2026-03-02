import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { gameId, walletAddress, accept } = await req.json();

    if (!gameId || !walletAddress) {
      throw new Error("gameId and walletAddress are required");
    }

    // Get responder profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (!profile) throw new Error("Profile not found");

    // Get the game
    const { data: game } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("id", gameId)
      .eq("status", "challenge_pending")
      .eq("challenge_target_id", profile.id)
      .single();

    if (!game) throw new Error("Challenge not found or already responded");

    if (accept) {
      const { error: updateErr } = await supabase
        .from("chicken_games")
        .update({
          player_b_id: profile.id,
          status: "depositing",
        })
        .eq("id", gameId);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ status: "accepted", gameId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const { error: updateErr } = await supabase
        .from("chicken_games")
        .update({ status: "declined" })
        .eq("id", gameId);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({ status: "declined", gameId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("chicken-respond error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
