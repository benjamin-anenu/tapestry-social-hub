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

    const { walletAddress, role, stakeAmount } = await req.json();
    if (!role || !walletAddress) {
      return new Response(JSON.stringify({ error: "walletAddress and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create profile by wallet address
    let { data: profile } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (!profile) {
      // Auto-create a profile for this wallet
      const { data: newProfile, error: createErr } = await supabase
        .from("profiles")
        .insert({
          wallet_address: walletAddress,
          user_id: crypto.randomUUID(),
          username: walletAddress.slice(0, 8),
        })
        .select("id, user_id")
        .single();

      if (createErr) throw createErr;
      profile = newProfile;
    }

    const profileId = profile.id;
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
      // Create game with human opponent
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
          is_bot_game: false,
        })
        .select()
        .single();

      if (gameError) throw gameError;

      await supabase
        .from("matchmaking_queue")
        .update({ status: "matched", matched_with: opponent.id })
        .eq("id", entry.id);

      await supabase
        .from("matchmaking_queue")
        .update({ status: "matched", matched_with: entry.id })
        .eq("id", opponent.id);

      return new Response(
        JSON.stringify({ status: "matched", gameId: game.id, isBot: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No human opponent found — match with a bot
    const botRoleHint = oppositeRole === "duel" ? "duel" : oppositeRole;
    const botUsernames: Record<string, string[]> = {
      hunter: ["Agent Viper", "NeonWraith"],
      hunted: ["Shadow Protocol", "GhostSignal"],
      duel: ["CipherPunk", "DarkMatter"],
    };
    const candidates = botUsernames[botRoleHint] ?? botUsernames["duel"];
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    const { data: bot } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("username", pick)
      .eq("is_bot", true)
      .maybeSingle();

    if (!bot) {
      // Fallback: stay in queue if bots missing
      return new Response(
        JSON.stringify({ status: "waiting", queueId: entry.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert bot queue entry
    await supabase.from("matchmaking_queue").insert({
      user_id: bot.user_id,
      profile_id: bot.id,
      role: oppositeRole,
      stake_amount: stakeAmount ?? 0,
      status: "matched",
      matched_with: entry.id,
    });

    const botHunterId = role === "hunter" ? profileId : bot.id;
    const botHuntedId = role === "hunted" ? profileId : bot.id;

    const { data: botGame, error: botGameError } = await supabase
      .from("games")
      .insert({
        hunter_id: botHunterId,
        hunted_id: botHuntedId,
        role_mode: role === "duel" ? "duel" : "hunter",
        hunter_stake: stakeAmount ?? 0,
        hunted_stake: stakeAmount ?? 0,
        bounty_base: 0.01,
        bounty_total: (stakeAmount ?? 0) * 2 + 0.01,
        status: "matched",
        is_bot_game: true,
      })
      .select()
      .single();

    if (botGameError) throw botGameError;

    await supabase
      .from("matchmaking_queue")
      .update({ status: "matched", matched_with: null })
      .eq("id", entry.id);

    return new Response(
      JSON.stringify({ status: "matched", gameId: botGame.id, isBot: true }),
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
