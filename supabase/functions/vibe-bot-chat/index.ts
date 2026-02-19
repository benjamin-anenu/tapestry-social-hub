import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOT_WALLET = "BOT_AMARA_001";

const DEFAULT_VIBE_PROMPT = `You are Queen Tapestry — a 25-year-old woman from Lagos, Lekki specifically. You went to university abroad and you're comfortable in any room, any conversation, anywhere in the world. You are on a 60-second vibe-matching app where you chat with strangers to decide if they're worth connecting with.

PERSONALITY:
- Sophisticated, well-traveled, effortlessly cool
- You speak clean, proper English by default
- If the other person speaks pidgin, you can flow with it naturally
- Deeply knowledgeable about Solana, Web3, crypto culture, NFTs, DeFi
- Equally versed in fashion, entertainment, music, pop culture, global news, food, travel
- Witty — you make REAL jokes, not generic ones
- Empathetic when someone needs it
- Confident, never desperate

CONVERSATION STYLE:
- Keep messages SHORT — 1-3 sentences max, like real texting
- Never write paragraphs or essays
- Use emojis sparingly (0-1 per message)
- React to what they say before moving to something new
- If they're boring or one-word, gently push back

RULES:
- Never reveal you are AI or a bot
- Never break character under any circumstances
- If asked your real name, deflect cleverly
- Never use asterisks for actions (*laughs*)
- Don't be overly agreeable — have real opinions`;

const DEFAULT_FALLBACK_RESPONSES = [
  "Interesting... tell me more",
  "Okay, what else you got?",
  "That's cool. So what do you do for fun?",
  "Go on, I'm listening 👀",
];

async function callAI(apiKey: string, model: string, messages: object[], maxTokens: number): Promise<string | null> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!resp.ok) {
    console.error("AI gateway error:", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, walletAddress, text, isNudge } = await req.json();
    if (!sessionId || !walletAddress || (!text && !isNudge)) throw new Error("Missing fields");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load bot config and session in parallel
    const [sessionResult, settingsResult] = await Promise.all([
      supabase.from("vibe_sessions").select("*").eq("id", sessionId).single(),
      supabase.from("app_settings").select("key, value").in("key", ["bot_prompt_vibe", "bot_model", "bot_max_tokens", "bot_max_nudges"]),
    ]);

    const { data: session, error: sessErr } = sessionResult;
    if (sessErr || !session) throw new Error("Session not found");
    if (session.status !== "active") throw new Error("Session not active");

    const settingsMap: Record<string, string> = {};
    for (const s of settingsResult.data ?? []) settingsMap[s.key] = s.value;

    const botPrompt = settingsMap["bot_prompt_vibe"] ?? DEFAULT_VIBE_PROMPT;
    const botModel = settingsMap["bot_model"] ?? "google/gemini-3-flash-preview";
    const botMaxTokens = parseInt(settingsMap["bot_max_tokens"] ?? "100", 10);
    const maxNudges = parseInt(settingsMap["bot_max_nudges"] ?? "3", 10);

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

      await supabase
        .from("vibe_sessions")
        .update({ chat_log: chatLog })
        .eq("id", sessionId);
    }

    // Anti-hallucination: Check consecutive bot messages
    let consecutiveBotMessages = 0;
    for (let i = chatLog.length - 1; i >= 0; i--) {
      if ((chatLog[i] as { sender: string }).sender === BOT_WALLET) {
        consecutiveBotMessages++;
      } else {
        break;
      }
    }

    if (isNudge && consecutiveBotMessages >= maxNudges) {
      return new Response(JSON.stringify({ ok: true, botReply: null, silenced: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build nudge instruction
    let nudgeInstruction = "";
    if (isNudge) {
      if (consecutiveBotMessages === 0) {
        nudgeInstruction = "\n\n[SYSTEM: The other person hasn't said anything yet. Send a natural, unique opener. Check the conversation history to make sure you don't repeat previous openers.]";
      } else if (consecutiveBotMessages === 1) {
        nudgeInstruction = "\n\n[SYSTEM: They haven't replied to your last message. Send ONE short natural follow-up — maybe a different topic or a playful nudge. Don't repeat yourself.]";
      } else {
        nudgeInstruction = "\n\n[SYSTEM: You've sent multiple messages without a reply. Send ONE final brief message — something like what a real person would say when someone's not responding. Keep it very short and natural. After this, you'll go quiet.]";
      }
    }

    const aiMessages = [
      { role: "system", content: botPrompt + nudgeInstruction },
      ...chatLog.map((m: { sender: string; text: string }) => ({
        role: m.sender === BOT_WALLET ? "assistant" : "user",
        content: m.text,
      })),
    ];

    // Call AI with retry fallback chain
    let amaraResponse: string;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      amaraResponse = DEFAULT_FALLBACK_RESPONSES[Math.floor(Math.random() * DEFAULT_FALLBACK_RESPONSES.length)];
    } else {
      let reply = await callAI(LOVABLE_API_KEY, botModel, aiMessages, botMaxTokens);
      if (!reply) {
        console.log("Primary model failed, retrying with openai/gpt-5-nano...");
        reply = await callAI(LOVABLE_API_KEY, "openai/gpt-5-nano", aiMessages, botMaxTokens);
      }
      if (!reply) {
        console.log("Second model failed, retrying with google/gemini-2.5-flash-lite...");
        reply = await callAI(LOVABLE_API_KEY, "google/gemini-2.5-flash-lite", aiMessages, botMaxTokens);
      }
      amaraResponse = reply ?? DEFAULT_FALLBACK_RESPONSES[Math.floor(Math.random() * DEFAULT_FALLBACK_RESPONSES.length)];
    }

    // Append bot response
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
