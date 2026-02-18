import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";

const AMARA_GREETINGS = [
  "Hey! 👋 I'm Amara. So tell me, what's your vibe?",
  "Hi there! I'm Amara, based in Lagos. What brings you here today?",
  "Hey! Amara here. I'm curious — what's your story?",
  "Hello! I'm Amara. Let's see if we click sha 💛 What do you do?",
];

const FRESHNESS_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const SESSION_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress } = await req.json();
    if (!walletAddress) throw new Error("walletAddress required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === Expire stale active sessions (older than 3 minutes) ===
    const staleThreshold = new Date(Date.now() - SESSION_EXPIRY_MS).toISOString();
    await supabase
      .from("vibe_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .in("status", ["waiting", "active"])
      .lt("created_at", staleThreshold);

    // Get requesting user's profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, country, username")
      .eq("wallet_address", walletAddress)
      .single();

    // Auto-create minimal profile if none exists
    let myProfile = profileData;
    if (!myProfile) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          wallet_address: walletAddress,
          user_id: crypto.randomUUID(),
          username: walletAddress.slice(0, 8),
          is_online: true,
          last_seen: new Date().toISOString(),
        })
        .select("id, country, username")
        .single();
      if (!newProfile) throw new Error("Could not create profile");
      myProfile = newProfile;
    }

    // Mark self as online
    await supabase
      .from("profiles")
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq("id", myProfile.id);

    // Freshness cutoff: only match users seen within last 2 minutes
    const freshnessCutoff = new Date(Date.now() - FRESHNESS_WINDOW_MS).toISOString();

    // Find candidates: online, fresh, not self, not bot
    let candidates: typeof profileData[] | null = null;

    // Prefer same country first
    if (myProfile.country) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, country")
        .eq("is_online", true)
        .eq("is_bot", false)
        .neq("id", myProfile.id)
        .eq("country", myProfile.country)
        .gte("last_seen", freshnessCutoff)
        .limit(20);
      candidates = data;
    }

    // Fallback to global
    if (!candidates || candidates.length === 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, country")
        .eq("is_online", true)
        .eq("is_bot", false)
        .neq("id", myProfile.id)
        .gte("last_seen", freshnessCutoff)
        .limit(20);
      candidates = data;
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

    const filtered = (candidates ?? []).filter((c) => !excludeIds.has(c.id));

    // If humans found, match with a random human
    if (filtered.length > 0) {
      const partner = filtered[Math.floor(Math.random() * filtered.length)];

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
        isBot: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === BOT FALLBACK: Match with Amara ===
    const { data: botProfile } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("wallet_address", BOT_WALLET)
      .single();

    if (!botProfile) {
      return new Response(JSON.stringify({ error: "No one online right now — try again in a bit!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const greeting = AMARA_GREETINGS[Math.floor(Math.random() * AMARA_GREETINGS.length)];

    const { data: session, error: sessionErr } = await supabase
      .from("vibe_sessions")
      .insert({
        user_a_id: myProfile.id,
        user_b_id: botProfile.id,
        status: "active",
        chat_log: [
          { sender: BOT_WALLET, text: greeting, time: Date.now() },
        ],
      })
      .select("id")
      .single();

    if (sessionErr) throw sessionErr;

    const initialMessages = [
      { sender: "them", text: greeting, time: Date.now() },
    ];

    return new Response(JSON.stringify({
      sessionId: session.id,
      role: "a",
      partnerName: botProfile.username === "queen_tapestry" ? "Queen Tapestry" : botProfile.display_name ?? "Amara",
      isBot: true,
      initialMessages,
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
