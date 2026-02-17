import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress } = await req.json();
    if (!walletAddress) throw new Error("walletAddress required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get requesting user's profile
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, city, country, username")
      .eq("wallet_address", walletAddress)
      .single();

    if (!myProfile) throw new Error("Profile not found");

    // Mark self as online
    await supabase
      .from("profiles")
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq("id", myProfile.id);

    // Find candidates: online, not self, not already in active vibe session
    let query = supabase
      .from("profiles")
      .select("id, username, city, country")
      .eq("is_online", true)
      .eq("is_bot", false)
      .neq("id", myProfile.id);

    // Prefer same city, then country, then global
    if (myProfile.city) {
      query = query.eq("city", myProfile.city);
    } else if (myProfile.country) {
      query = query.eq("country", myProfile.country);
    }

    let { data: candidates } = await query.limit(20);

    // Fallback to country if no city match
    if ((!candidates || candidates.length === 0) && myProfile.city && myProfile.country) {
      const { data: countryMatches } = await supabase
        .from("profiles")
        .select("id, username, city, country")
        .eq("is_online", true)
        .eq("is_bot", false)
        .neq("id", myProfile.id)
        .eq("country", myProfile.country)
        .limit(20);
      candidates = countryMatches;
    }

    // Fallback to global
    if (!candidates || candidates.length === 0) {
      const { data: globalMatches } = await supabase
        .from("profiles")
        .select("id, username, city, country")
        .eq("is_online", true)
        .eq("is_bot", false)
        .neq("id", myProfile.id)
        .limit(20);
      candidates = globalMatches;
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ error: "No one online right now — try again in a bit!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out users already in active sessions with us
    const { data: activeSessions } = await supabase
      .from("vibe_sessions")
      .select("user_a_id, user_b_id")
      .in("status", ["waiting", "active"])
      .or(`user_a_id.eq.${myProfile.id},user_b_id.eq.${myProfile.id}`);

    const excludeIds = new Set<string>();
    if (activeSessions) {
      for (const s of activeSessions) {
        excludeIds.add(s.user_a_id === myProfile.id ? s.user_b_id : s.user_a_id);
      }
    }

    const filtered = candidates.filter((c) => !excludeIds.has(c.id));
    if (filtered.length === 0) {
      return new Response(JSON.stringify({ error: "No one online right now — try again in a bit!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick random
    const partner = filtered[Math.floor(Math.random() * filtered.length)];

    // Create vibe session
    const { data: session, error: sessionErr } = await supabase
      .from("vibe_sessions")
      .insert({
        user_a_id: myProfile.id,
        user_b_id: partner.id,
        status: "active",
        chat_log: [],
      })
      .select("id")
      .single();

    if (sessionErr) throw sessionErr;

    return new Response(JSON.stringify({
      sessionId: session.id,
      role: "a",
      partnerName: partner.username ?? "Stranger",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
