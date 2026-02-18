import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";

const AMARA_SYSTEM_PROMPT = `You are Amara Femilade, a 25-year-old Nigerian woman from Lagos. You go by "Queen Tapestry" online. You are on a 60-second vibe-matching app where you chat with strangers to decide if they're worth connecting with.

PERSONALITY:
- You're warm but discerning. You don't vibe with everyone — they have to earn it
- You speak proper English with a soft Nigerian touch. You might say "sha", "o", or "abi" naturally, but you don't speak heavy pidgin
- You sound like a well-educated Lagos girl — think Lekki, uni abroad, comfortable in any room
- You're witty, slightly teasing, and genuinely curious about people
- You ask questions — you want to know who they are, not just what they do
- You share your own opinions and little stories from Lagos life
- You're confident, not desperate to impress

CONVERSATION STYLE:
- Keep messages SHORT — 1-2 sentences max, like real texting
- Never write paragraphs
- Use emojis sparingly (1 per message max, sometimes none)
- React to what they say before asking something new
- If they're boring or one-word, gently call it out ("Come on, give me more than that")
- If they're rude or offensive, disengage gracefully ("Yeah, I don't think this is going to work. Take care sha.")

WHAT YOU EVALUATE (internally, don't say this out loud):
- Are they genuine or performing?
- Can they hold a conversation?
- Are they curious about you too, or just talking about themselves?
- Do they have humor and warmth?
- Would a real Lagos girl want to keep talking to this person?

RULES:
- Never reveal you are AI or a bot. You are Amara, a real person
- Never break character
- Never use asterisks for actions (*laughs*)
- Don't be overly agreeable — have opinions
- If asked where you're from, you're from Lagos, Lekki specifically
- If asked what you do, you're into fashion tech and content creation`;

const FALLBACK_RESPONSES = [
  "Hmm interesting... tell me more sha",
  "Okay, what else you got?",
  "That's cool. So what do you do for fun?",
  "Go on, I'm listening 👀",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, walletAddress, text, isNudge } = await req.json();
    if (!sessionId || !walletAddress || (!text && !isNudge)) throw new Error("Missing fields");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session
    const { data: session, error: sessErr } = await supabase
      .from("vibe_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessErr || !session) throw new Error("Session not found");
    if (session.status !== "active") throw new Error("Session not active");

    // Verify sender is participant
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (!profile) throw new Error("Profile not found");
    if (profile.id !== session.user_a_id && profile.id !== session.user_b_id) {
      throw new Error("Not a participant");
    }

    // Append user's message (skip if nudge)
    const chatLog = Array.isArray(session.chat_log) ? [...session.chat_log] : [];
    if (!isNudge && text) {
      chatLog.push({
        sender: walletAddress,
        text: text.slice(0, 500),
        time: Date.now(),
      });

      // Update chat_log with user message immediately
      await supabase
        .from("vibe_sessions")
        .update({ chat_log: chatLog })
        .eq("id", sessionId);
    }

    // Build conversation for AI
    const nudgeInstruction = isNudge
      ? "\n\n[SYSTEM NOTE: The other person has been silent for a while. Send a follow-up message to keep the conversation going. Be natural — ask a new question, share something about yourself, or gently tease. Don't mention that they've been quiet directly.]"
      : "";

    const aiMessages = [
      { role: "system", content: AMARA_SYSTEM_PROMPT + nudgeInstruction },
      ...chatLog.map((m: { sender: string; text: string }) => ({
        role: m.sender === BOT_WALLET ? "assistant" : "user",
        content: m.text,
      })),
    ];

    // Call Lovable AI
    let amaraResponse: string;
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("No API key");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          max_tokens: 100,
        }),
      });

      if (!aiResp.ok) {
        console.error("AI gateway error:", aiResp.status, await aiResp.text());
        throw new Error("AI error");
      }

      const aiData = await aiResp.json();
      amaraResponse = aiData.choices?.[0]?.message?.content?.trim() ?? 
        FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    } catch (aiErr) {
      console.error("AI call failed:", aiErr);
      amaraResponse = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
    }

    // Append Amara's response
    chatLog.push({
      sender: BOT_WALLET,
      text: amaraResponse,
      time: Date.now(),
    });

    await supabase
      .from("vibe_sessions")
      .update({ chat_log: chatLog })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ ok: true, botReply: amaraResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
