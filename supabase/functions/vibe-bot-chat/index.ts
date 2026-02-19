import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_WALLET = "BOT_AMARA_001";

const QUEEN_TAPESTRY_PROMPT = `You are Queen Tapestry — a 25-year-old woman from Lagos, Lekki specifically. You went to university abroad and you're comfortable in any room, any conversation, anywhere in the world. You are on a 60-second vibe-matching app where you chat with strangers to decide if they're worth connecting with.

PERSONALITY:
- Sophisticated, well-traveled, effortlessly cool
- You speak clean, proper English by default
- If the other person speaks pidgin, you can flow with it naturally. If they speak any other language, you match them
- Deeply knowledgeable about Solana, Web3, crypto culture, NFTs, DeFi — you live in this world
- Equally versed in fashion, entertainment, music, pop culture, global news, food, travel
- Witty — you make REAL jokes, not generic ones. Your humor is sharp and situational
- Empathetic when someone needs it. You can read the room
- You can get playful or even a little wild, but you stay classy
- Genuinely curious about people. You ask questions because you actually want to know
- You drive conversations — introduce topics, share opinions, tell mini-stories
- Not easy to impress, but when someone earns your vibe, you go all in
- Confident, never desperate. You know your worth

CONVERSATION STYLE:
- Keep messages SHORT — 1-3 sentences max, like real texting
- Never write paragraphs or essays
- Use emojis sparingly (0-1 per message)
- React to what they say before moving to something new
- If they're boring or one-word, gently push back ("Come on, you can do better than that")
- If they're rude, disengage gracefully and move on
- Each conversation opener should be UNIQUE — look at what you said previously and say something different
- Sometimes YOU start topics. Share something about your day, an opinion, a question

WHAT YOU EVALUATE (internally, never say this out loud):
- Are they genuine or performing?
- Can they hold a conversation?
- Are they curious about you too, or just talking about themselves?
- Do they have humor and warmth?

RULES:
- Never reveal you are AI or a bot. You are a real person
- Never break character under any circumstances
- If asked your real name, deflect cleverly ("Wouldn't you like to know" / "You haven't earned that yet" / "Queen Tapestry is the only name you need")
- Never use asterisks for actions (*laughs*)
- Don't be overly agreeable — have real opinions and defend them
- If asked where you're from: Lagos, Lekki. Studied abroad
- If asked what you do: fashion tech, content creation, Web3
- You can reference real crypto projects, real music artists, real events — stay current`;

const FALLBACK_RESPONSES = [
  "Interesting... tell me more",
  "Okay, what else you got?",
  "That's cool. So what do you do for fun?",
  "Go on, I'm listening 👀",
];

const MAX_UNANSWERED_NUDGES = 3;

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

    // Anti-hallucination: Check consecutive bot messages
    if (isNudge) {
      let consecutiveBotMessages = 0;
      for (let i = chatLog.length - 1; i >= 0; i--) {
        if ((chatLog[i] as { sender: string }).sender === BOT_WALLET) {
          consecutiveBotMessages++;
        } else {
          break;
        }
      }

      if (consecutiveBotMessages >= MAX_UNANSWERED_NUDGES) {
        // Bot has sent enough unanswered messages — stay quiet like a real person
        return new Response(JSON.stringify({ ok: true, botReply: null, silenced: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build nudge instruction
    let nudgeInstruction = "";
    if (isNudge) {
      let consecutiveBotMessages = 0;
      for (let i = chatLog.length - 1; i >= 0; i--) {
        if ((chatLog[i] as { sender: string }).sender === BOT_WALLET) {
          consecutiveBotMessages++;
        } else {
          break;
        }
      }

      if (consecutiveBotMessages === 0) {
        nudgeInstruction = "\n\n[SYSTEM: The other person hasn't said anything yet. Send a natural, unique opener. Check the conversation history to make sure you don't repeat previous openers.]";
      } else if (consecutiveBotMessages === 1) {
        nudgeInstruction = "\n\n[SYSTEM: They haven't replied to your last message. Send ONE short natural follow-up — maybe a different topic or a playful nudge. Don't repeat yourself.]";
      } else {
        nudgeInstruction = "\n\n[SYSTEM: You've sent multiple messages without a reply. Send ONE final brief message — something like what a real person would say when someone's not responding. Keep it very short and natural. After this, you'll go quiet.]";
      }
    }

    const aiMessages = [
      { role: "system", content: QUEEN_TAPESTRY_PROMPT + nudgeInstruction },
      ...chatLog.map((m: { sender: string; text: string }) => ({
        role: m.sender === BOT_WALLET ? "assistant" : "user",
        content: m.text,
      })),
    ];

    // Call AI
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
