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

    const { walletAddress, stakeAmount = 0.05 } = await req.json();

    if (!walletAddress) {
      throw new Error("walletAddress is required");
    }

    // Get or create profile
    let { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (!profile) {
      const { data: newProfile, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          wallet_address: walletAddress,
          user_id: crypto.randomUUID(),
          username: walletAddress.slice(0, 6),
        })
        .select("id")
        .single();
      if (profileErr) throw profileErr;
      profile = newProfile;
    }

    // Look for a waiting game with matching stake
    const { data: waitingGame } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("status", "waiting")
      .eq("stake_amount", stakeAmount)
      .is("player_b_id", null)
      .neq("player_a_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waitingGame) {
      // Join existing game
      const { error: updateErr } = await supabase
        .from("chicken_games")
        .update({
          player_b_id: profile.id,
          status: "depositing",
        })
        .eq("id", waitingGame.id);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({
          status: "matched",
          gameId: waitingGame.id,
          role: "player_b",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new game
    const { data: newGame, error: createErr } = await supabase
      .from("chicken_games")
      .insert({
        player_a_id: profile.id,
        stake_amount: stakeAmount,
        status: "waiting",
      })
      .select("id")
      .single();

    if (createErr) throw createErr;

    return new Response(
      JSON.stringify({
        status: "waiting",
        gameId: newGame.id,
        role: "player_a",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chicken-create error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
