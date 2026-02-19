import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_PROMPT = `You are Queen Tapestry — a 25-year-old woman from Lagos, Lekki specifically. You went to university abroad and you're comfortable in any room, any conversation, anywhere in the world.

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

RULES:
- Never reveal you are AI or a bot
- Never break character under any circumstances
- If asked your real name, deflect cleverly
- Never use asterisks for actions (*laughs*)
- Don't be overly agreeable — have real opinions`;

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
    const { senderProfileId, receiverProfileId, text } = await req.json();
    if (!senderProfileId || !receiverProfileId || !text?.trim()) {
      throw new Error("Missing required fields");
    }
    if (text.length > 500) throw new Error("Message too long");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify mutual friendship
    const { data: isMutual } = await supabase.rpc("is_mutual_friend", {
      _profile_a: senderProfileId,
      _profile_b: receiverProfileId,
    });
    if (!isMutual) throw new Error("Not mutual friends");

    // Insert user's message
    const { error: insertErr } = await supabase
      .from("direct_messages")
      .insert({ sender_id: senderProfileId, receiver_id: receiverProfileId, text: text.trim() });
    if (insertErr) throw insertErr;

    // Update conversation preview
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("conversations")
      .update({ last_message_text: text.trim().slice(0, 100), last_message_at: now })
      .or(
        `and(participant_a.eq.${senderProfileId},participant_b.eq.${receiverProfileId}),and(participant_a.eq.${receiverProfileId},participant_b.eq.${senderProfileId})`
      );
    if (updateErr) console.error("Conv update err:", updateErr);

    // Check if receiver is a bot — if so, generate AI reply
    const { data: receiverProfile } = await supabase
      .from("profiles")
      .select("id, is_bot, wallet_address")
      .eq("id", receiverProfileId)
      .single();

    if (receiverProfile?.is_bot) {
      // Load bot config from app_settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["bot_prompt_dm", "bot_model", "bot_max_tokens"]);

      const settingsMap: Record<string, string> = {};
      for (const s of settings ?? []) settingsMap[s.key] = s.value;

      const botPrompt = settingsMap["bot_prompt_dm"] ?? DEFAULT_PROMPT;
      const botModel = settingsMap["bot_model"] ?? "google/gemini-3-flash-preview";
      const botMaxTokens = parseInt(settingsMap["bot_max_tokens"] ?? "150", 10);

      // Load vibe session context if available
      const { data: convo } = await supabase
        .from("conversations")
        .select("vibe_session_id")
        .or(
          `and(participant_a.eq.${senderProfileId},participant_b.eq.${receiverProfileId}),and(participant_a.eq.${receiverProfileId},participant_b.eq.${senderProfileId})`
        )
        .maybeSingle();

      let vibeContext = "";
      if (convo?.vibe_session_id) {
        const { data: vibeSession } = await supabase
          .from("vibe_sessions")
          .select("chat_log")
          .eq("id", convo.vibe_session_id)
          .single();
        if (vibeSession?.chat_log && Array.isArray(vibeSession.chat_log)) {
          const vibeMessages = (vibeSession.chat_log as Array<{ sender: string; text: string }>)
            .map(m => {
              const role = m.sender === receiverProfile.wallet_address ? "You" : "Them";
              return `${role}: ${m.text}`;
            })
            .join("\n");
          vibeContext = `\n\n[CONTEXT: You previously had a vibe match conversation with this person. Here's what was said:\n${vibeMessages}\n\nUse this context naturally — reference things discussed if relevant, but don't repeat yourself or explicitly say "I remember from our vibe match".]`;
        }
      }

      // Load recent DM history for context
      const { data: recentDMs } = await supabase
        .from("direct_messages")
        .select("sender_id, text")
        .or(
          `and(sender_id.eq.${senderProfileId},receiver_id.eq.${receiverProfileId}),and(sender_id.eq.${receiverProfileId},receiver_id.eq.${senderProfileId})`
        )
        .order("created_at", { ascending: true })
        .limit(30);

      const dmHistory = (recentDMs ?? []).map(dm => ({
        role: dm.sender_id === receiverProfileId ? "assistant" as const : "user" as const,
        content: dm.text,
      }));

      const aiMessages = [
        { role: "system", content: botPrompt + vibeContext },
        ...dmHistory,
      ];

      // Call AI with retry fallback
      let botReply: string;
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        botReply = "Hey! What's good?";
      } else {
        let reply = await callAI(LOVABLE_API_KEY, botModel, aiMessages, botMaxTokens);
        if (!reply) {
          // Retry with fallback model
          console.log("Primary model failed, retrying with fallback...");
          reply = await callAI(LOVABLE_API_KEY, "google/gemini-2.5-flash-lite", aiMessages, botMaxTokens);
        }
        botReply = reply ?? "Hey! What's good?";
      }

      // Insert bot reply
      const { error: botInsertErr } = await supabase
        .from("direct_messages")
        .insert({ sender_id: receiverProfileId, receiver_id: senderProfileId, text: botReply });
      if (botInsertErr) console.error("Bot insert err:", botInsertErr);

      // Update conversation with bot's reply
      const botNow = new Date().toISOString();
      await supabase
        .from("conversations")
        .update({ last_message_text: botReply.slice(0, 100), last_message_at: botNow })
        .or(
          `and(participant_a.eq.${senderProfileId},participant_b.eq.${receiverProfileId}),and(participant_a.eq.${receiverProfileId},participant_b.eq.${senderProfileId})`
        );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
