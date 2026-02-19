import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";
const WAIT_TIMEOUT_MS = 5_000; // 5 seconds before bot fallback

const AMARA_GREETINGS = [
  "Hey! 👋 I'm Amara. So tell me, what's your vibe?",
  "Hi there! I'm Amara, based in Lagos. What brings you here today?",
  "Hey! Amara here. I'm curious — what's your story?",
  "Hello! I'm Amara. Let's see if we click sha 💛 What do you do?",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress, sessionId } = await req.json();
    if (!walletAddress || !sessionId) throw new Error("walletAddress and sessionId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
        const greeting = AMARA_GREETINGS[Math.floor(Math.random() * AMARA_GREETINGS.length)];

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
          partnerName: botProfile.username === "queen_tapestry" ? "Queen Tapestry" : botProfile.display_name ?? "Amara",
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
