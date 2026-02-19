import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY_MS = 3 * 60 * 1000; // 3 minutes

const AMARA_GREETINGS = [
  "Hey! 👋 I'm Amara. So tell me, what's your vibe?",
  "Hi there! I'm Amara, based in Lagos. What brings you here today?",
  "Hey! Amara here. I'm curious — what's your story?",
  "Hello! I'm Amara. Let's see if we click sha 💛 What do you do?",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress } = await req.json();
    if (!walletAddress) throw new Error("walletAddress required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // === Read matching mode ===
    const { data: modeSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "matching_mode")
      .single();
    const matchingMode = modeSetting?.value ?? "auto";

    // === Expire stale sessions ===
    const staleThreshold = new Date(Date.now() - SESSION_EXPIRY_MS).toISOString();
    await supabase
      .from("vibe_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .in("status", ["waiting", "active"])
      .lt("created_at", staleThreshold);

    // === Get or create profile ===
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, country, username")
      .eq("wallet_address", walletAddress)
      .single();

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

    // Mark self online
    await supabase
      .from("profiles")
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq("id", myProfile.id);

    // === STEP 1: Check if I already have a waiting session ===
    const { data: myWaiting } = await supabase
      .from("vibe_sessions")
      .select("id")
      .eq("user_a_id", myProfile.id)
      .eq("status", "waiting")
      .is("user_b_id", null)
      .limit(1)
      .maybeSingle();

    if (myWaiting) {
      // I'm already waiting — tell client to poll
      return new Response(JSON.stringify({
        status: "waiting",
        sessionId: myWaiting.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === STEP 2: Check if someone ELSE is waiting — join their session ===
    if (matchingMode !== "bot_only") {
      const { data: waitingSessions } = await supabase
        .from("vibe_sessions")
        .select("id, user_a_id")
        .eq("status", "waiting")
        .is("user_b_id", null)
        .neq("user_a_id", myProfile.id)
        .order("created_at", { ascending: true })
        .limit(10);

      if (waitingSessions && waitingSessions.length > 0) {
        // Try to claim the first available waiting session
        for (const ws of waitingSessions) {
          const { data: claimed, error: claimErr } = await supabase
            .from("vibe_sessions")
            .update({ user_b_id: myProfile.id, status: "active" })
            .eq("id", ws.id)
            .eq("status", "waiting")
            .is("user_b_id", null)
            .select("id, user_a_id")
            .maybeSingle();

          if (claimed && !claimErr) {
            // Get partner info
            const { data: partner } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", claimed.user_a_id)
              .single();

            return new Response(JSON.stringify({
              status: "matched",
              sessionId: claimed.id,
              role: "b",
              partnerName: partner?.username ?? "Stranger",
              isBot: false,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // === STEP 3: Look for online users and try direct match ===
      const freshnessCutoff = new Date(Date.now() - FRESHNESS_WINDOW_MS).toISOString();

      // Get users I'm already in active/waiting sessions with
      const { data: activeSessions } = await supabase
        .from("vibe_sessions")
        .select("user_a_id, user_b_id")
        .in("status", ["waiting", "active"])
        .or(`user_a_id.eq.${myProfile.id},user_b_id.eq.${myProfile.id}`);

      const excludeIds = new Set<string>();
      if (activeSessions) {
        for (const s of activeSessions) {
          if (s.user_a_id && s.user_a_id !== myProfile.id) excludeIds.add(s.user_a_id);
          if (s.user_b_id && s.user_b_id !== myProfile.id) excludeIds.add(s.user_b_id);
        }
      }

      // Search for online candidates
      let candidates: any[] | null = null;

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

      const filtered = (candidates ?? []).filter((c) => !excludeIds.has(c.id));

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
          status: "matched",
          sessionId: session.id,
          role: "a",
          partnerName: partner.username ?? "Stranger",
          isBot: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === STEP 4: No humans found — create a waiting session (unless human_only blocks bot fallback) ===
    if (matchingMode === "human_only") {
      // Create waiting session for human_only mode too
      const { data: session } = await supabase
        .from("vibe_sessions")
        .insert({
          user_a_id: myProfile.id,
          user_b_id: null,
          status: "waiting",
          chat_log: [],
        })
        .select("id")
        .single();

      return new Response(JSON.stringify({
        status: "waiting",
        sessionId: session?.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto mode: create waiting session (poll function will handle bot fallback after timeout)
    const { data: session } = await supabase
      .from("vibe_sessions")
      .insert({
        user_a_id: myProfile.id,
        user_b_id: null,
        status: "waiting",
        chat_log: [],
      })
      .select("id")
      .single();

    return new Response(JSON.stringify({
      status: "waiting",
      sessionId: session?.id,
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
