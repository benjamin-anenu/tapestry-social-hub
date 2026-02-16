import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { profileId, walletAddress, role, stakeAmount } = await req.json();
    if (!profileId || !role || !walletAddress) {
      return new Response(JSON.stringify({ error: "profileId, walletAddress, and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the profile exists and matches the wallet
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("id", profileId)
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found for this wallet" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = profile.user_id;

    // Insert into queue
    const { data: entry, error: insertError } = await supabase
      .from("matchmaking_queue")
      .insert({
        user_id: userId,
        profile_id: profileId,
        role,
        stake_amount: stakeAmount ?? 0,
        status: "waiting",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Look for a compatible opponent
    const oppositeRole = role === "hunter" ? "hunted" : role === "hunted" ? "hunter" : "duel";

    const { data: opponent } = await supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("status", "waiting")
      .eq("role", oppositeRole)
      .neq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (opponent) {
      // Create game
      const hunterId = role === "hunter" ? profileId : opponent.profile_id;
      const huntedId = role === "hunted" ? profileId : opponent.profile_id;

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          hunter_id: hunterId,
          hunted_id: huntedId,
          role_mode: role === "duel" ? "duel" : "hunter",
          hunter_stake: role === "hunter" ? (stakeAmount ?? 0) : (opponent.stake_amount ?? 0),
          hunted_stake: role === "hunted" ? (stakeAmount ?? 0) : (opponent.stake_amount ?? 0),
          bounty_base: 0.01,
          bounty_total: (stakeAmount ?? 0) + (opponent.stake_amount ?? 0) + 0.01,
          status: "matched",
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Update both queue entries
      await supabase
        .from("matchmaking_queue")
        .update({ status: "matched", matched_with: opponent.id })
        .eq("id", entry.id);

      await supabase
        .from("matchmaking_queue")
        .update({ status: "matched", matched_with: entry.id })
        .eq("id", opponent.id);

      return new Response(
        JSON.stringify({ status: "matched", gameId: game.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "waiting", queueId: entry.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("matchmaking error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
