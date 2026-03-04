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

    const { walletAddress, stakeAmount = 0.05, targetProfileId, gameDuration = 60 } = await req.json();

    if (!walletAddress) {
      throw new Error("walletAddress is required");
    }

    // Clamp duration
    const duration = Math.min(Math.max(Math.round(gameDuration), 10), 300);
    const isFreePlay = stakeAmount === 0;

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

    // === FLOW 1: Friend Challenge (targeted) ===
    if (targetProfileId) {
      const { data: existing } = await supabase
        .from("chicken_games")
        .select("id")
        .eq("player_a_id", profile.id)
        .eq("challenge_target_id", targetProfileId)
        .eq("status", "challenge_pending")
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            status: "challenge_pending",
            gameId: existing.id,
            role: "player_a",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newGame, error: createErr } = await supabase
        .from("chicken_games")
        .insert({
          player_a_id: profile.id,
          challenge_target_id: targetProfileId,
          stake_amount: stakeAmount,
          game_duration: duration,
          status: "challenge_pending",
        })
        .select("id")
        .single();

      if (createErr) throw createErr;

      return new Response(
        JSON.stringify({
          status: "challenge_pending",
          gameId: newGame.id,
          role: "player_a",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === FLOW 2: Random Arena Matching (no target) ===
    // Match by stake AND duration
    const { data: waitingGame } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("status", "waiting")
      .eq("stake_amount", stakeAmount)
      .eq("game_duration", duration)
      .is("player_b_id", null)
      .is("challenge_target_id", null)
      .neq("player_a_id", profile.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (waitingGame) {
      // For free play, go straight to active (skip depositing)
      const newStatus = isFreePlay ? "active" : "depositing";
      const updateFields: Record<string, unknown> = {
        player_b_id: profile.id,
        status: newStatus,
      };
      if (isFreePlay) {
        updateFields.started_at = new Date().toISOString();
      }

      const { error: updateErr } = await supabase
        .from("chicken_games")
        .update(updateFields)
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

    // Create new open game
    const { data: newGame, error: createErr } = await supabase
      .from("chicken_games")
      .insert({
        player_a_id: profile.id,
        stake_amount: stakeAmount,
        game_duration: duration,
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
