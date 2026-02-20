import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";
const WAIT_TIMEOUT_MS = 5_000; // 5 seconds before bot fallback

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

async function generateOpener(apiKey: string, seed: string): Promise<string> {
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
          return text.replace(/^["']|["']$/g, "");
        }
      } catch {
        continue;
      }
    }

    return seed;
  } catch {
    return seed;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress, sessionId } = await req.json();
    if (!walletAddress || !sessionId) throw new Error("walletAddress and sessionId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Read matching mode
    const { data: modeSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "matching_mode")
      .single();
    const matchingMode = modeSetting?.value ?? "auto";

    // Get the session
    const { data: session } = await supabase
      .from("vibe_sessions")
      .select("id, user_a_id, user_b_id, status, created_at, chat_starts_at")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ status: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If session is already active (someone joined), return matched
    if (session.status === "active" && session.user_b_id) {
      // Determine role and partner
      const isUserA = session.user_a_id === (await getProfileId(supabase, walletAddress));
      const partnerId = isUserA ? session.user_b_id : session.user_a_id;

      const { data: partner } = await supabase
        .from("profiles")
        .select("username, display_name, wallet_address, is_bot")
        .eq("id", partnerId)
        .single();

      return new Response(JSON.stringify({
        status: "matched",
        sessionId: session.id,
        role: isUserA ? "a" : "b",
        partnerName: partner?.display_name || partner?.username || "Stranger",
        isBot: partner?.is_bot ?? false,
        chatStartsAt: session.chat_starts_at ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If session completed/expired
    if (session.status !== "waiting") {
      return new Response(JSON.stringify({ status: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Still waiting — check if we should try to find someone or fall back to bot
    const waitingMs = Date.now() - new Date(session.created_at).getTime();

    // Before timeout, try to find other waiting sessions to match with
    const myProfileId = await getProfileId(supabase, walletAddress);

    // Check for other waiting sessions we can join
    const { data: otherWaiting } = await supabase
      .from("vibe_sessions")
      .select("id, user_a_id")
      .eq("status", "waiting")
      .is("user_b_id", null)
      .neq("user_a_id", myProfileId)
      .neq("id", sessionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (otherWaiting && matchingMode !== "bot_only") {
      const chatStartsAt = new Date(Date.now() + 4000).toISOString();
      const { data: claimed } = await supabase
        .from("vibe_sessions")
        .update({ user_b_id: myProfileId, status: "active", chat_starts_at: chatStartsAt })
        .eq("id", otherWaiting.id)
        .eq("status", "waiting")
        .is("user_b_id", null)
        .select("id, user_a_id")
        .maybeSingle();

      if (claimed) {
        await supabase
          .from("vibe_sessions")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", sessionId);

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

    // If waited too long, fall back to bot
    if (waitingMs >= WAIT_TIMEOUT_MS && matchingMode !== "human_only") {
      const { data: botProfile } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("wallet_address", BOT_WALLET)
        .single();

      if (botProfile) {
        const seed = OPENER_SEEDS[Math.floor(Math.random() * OPENER_SEEDS.length)];
        const greeting = await generateOpener(apiKey, seed);

        // Update the waiting session to be a bot session
        await supabase
          .from("vibe_sessions")
          .update({
            user_b_id: botProfile.id,
            status: "active",
            chat_log: [{ sender: BOT_WALLET, text: greeting, time: Date.now() }],
          })
          .eq("id", sessionId);

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
    }

    // Still waiting
    return new Response(JSON.stringify({
      status: "waiting",
      waitingSeconds: Math.floor(waitingMs / 1000),
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

async function getProfileId(supabase: any, walletAddress: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("wallet_address", walletAddress)
    .single();
  return data?.id;
}
