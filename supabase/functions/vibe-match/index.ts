import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;
const SESSION_EXPIRY_MS = 3 * 60 * 1000;

// Style seeds — used as creative references for AI, never shown directly to users
const OPENER_SEEDS = [
  "You got 60 seconds to convince me you're interesting. Go. 👀",
  "Okay so — Lagos or outside? Let's start there.",
  "First question: NFTs or music? Don't overthink it.",
  "Right, so are you the type who talks about doing things, or are you actually doing them?",
  "Not going to waste time on small talk — what's the last thing that genuinely surprised you?",
  "Quick vibe check: what's your current obsession? Could be anything.",
  "So what's the energy today — work stress or unbothered?",
  "I'm going to ask you something and I want a real answer: what's actually on your mind lately?",
];

async function generateOpener(apiKey: string, seed: string, botPrompt: string): Promise<string> {
  try {
    const models = [
      "google/gemini-3-flash-preview",
      "openai/gpt-5-nano",
      "google/gemini-2.5-flash-lite",
    ];

    for (const model of models) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: `You are Queen Tapestry — a sharp, Lekki-raised, well-traveled 25-year-old woman. You're on a 60-second vibe-matching app. Generate ONE opening message. Rules: No name, no intro, no "I'm...", immediate personality, punchy, max 1 sentence, 0-1 emoji, unique every time. Never repeat a phrase you've used before. Be genuinely different each time.`,
              },
              {
                role: "user",
                content: `Here's an example of your style: "${seed}"\nGenerate a completely different opener with the same energy. One sentence only. No quotes around it.`,
              },
            ],
            max_tokens: 60,
            temperature: 0.95,
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 5) {
          // Strip surrounding quotes if the model added them
          return text.replace(/^["']|["']$/g, "");
        }
      } catch {
        continue;
      }
    }

    // All models failed — fall back to seed
    return seed;
  } catch {
    return seed;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress } = await req.json();
    if (!walletAddress) throw new Error("walletAddress required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

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

      // Immediately try to sync Tapestry identity for the new profile
      try {
        const tapestryApiKey = Deno.env.get("TAPESTRY_API_KEY");
        if (tapestryApiKey) {
          const res = await fetch(
            `https://api.usetapestry.dev/api/v1/identities/${encodeURIComponent(walletAddress)}/profiles?apiKey=${tapestryApiKey}`
          );
          if (res.ok) {
            const data = await res.json();
            const profiles = data.profiles || data || [];
            const list = Array.isArray(profiles) ? profiles : [];
            const vibeProfile = list.find((p: any) => {
              const ns = typeof p.namespace === "string" ? p.namespace : p.namespace?.name;
              return ns === "vibe" || ns === "find";
            });
            if (vibeProfile) {
              const uname = vibeProfile.username || vibeProfile.id;
              if (uname) {
                await supabase.from("profiles").update({
                  display_name: uname,
                  username: uname,
                  tapestry_id: uname,
                }).eq("id", newProfile.id);
                myProfile = { ...myProfile, username: uname };
              }
            }
          }
        }
      } catch (e) {
        console.warn("Tapestry sync on create failed (non-blocking):", e);
      }
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
            const chatStartsAt = new Date(Date.now() + 4000).toISOString();
            await supabase
              .from("vibe_sessions")
              .update({ chat_starts_at: chatStartsAt })
              .eq("id", claimed.id);

            const { data: partner } = await supabase
              .from("profiles")
              .select("username, display_name")
              .eq("id", claimed.user_a_id)
              .single();

            return new Response(JSON.stringify({
              status: "matched",
              sessionId: claimed.id,
              role: "b",
              partnerName: partner?.display_name || partner?.username || "Stranger",
              isBot: false,
              chatStartsAt,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // === STEP 3: Look for online users and try direct match ===
      const freshnessCutoff = new Date(Date.now() - FRESHNESS_WINDOW_MS).toISOString();

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
        const chatStartsAt = new Date(Date.now() + 4000).toISOString();
        const { data: session, error: sessionErr } = await supabase
          .from("vibe_sessions")
          .insert({
            user_a_id: myProfile.id,
            user_b_id: partner.id,
            status: "active",
            chat_log: [],
            chat_starts_at: chatStartsAt,
          })
          .select("id")
          .single();
        if (sessionErr) throw sessionErr;

        const { data: partnerFull } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", partner.id)
          .single();

        return new Response(JSON.stringify({
          status: "matched",
          sessionId: session.id,
          role: "a",
          partnerName: partnerFull?.display_name || partner.username || "Stranger",
          isBot: false,
          chatStartsAt,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === STEP 4: No humans found ===

    if (matchingMode === "human_only") {
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

    // === Auto/bot_only mode: Instant bot match with AI-generated opener ===
    const { data: botProfile } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("wallet_address", BOT_WALLET)
      .single();

    if (botProfile) {
      const seed = OPENER_SEEDS[Math.floor(Math.random() * OPENER_SEEDS.length)];

      // Read bot prompt from settings for context (optional enrichment)
      const { data: promptSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "bot_prompt")
        .maybeSingle();
      const botPrompt = promptSetting?.value ?? "";

      // Generate AI opener in parallel with session insert prep
      const greeting = await generateOpener(apiKey, seed, botPrompt);

      const { data: session, error: sessionErr } = await supabase
        .from("vibe_sessions")
        .insert({
          user_a_id: myProfile.id,
          user_b_id: botProfile.id,
          status: "active",
          chat_log: [{ sender: BOT_WALLET, text: greeting, time: Date.now() }],
        })
        .select("id")
        .single();
      if (sessionErr) throw sessionErr;

      return new Response(JSON.stringify({
        status: "matched",
        sessionId: session.id,
        role: "a",
        partnerName: botProfile.username === "queen_tapestry" ? "Queen Tapestry" : botProfile.display_name ?? "Queen Tapestry",
        isBot: true,
        initialMessages: [{ sender: "them", text: greeting, time: Date.now() }],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: no bot profile found, create waiting session
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
