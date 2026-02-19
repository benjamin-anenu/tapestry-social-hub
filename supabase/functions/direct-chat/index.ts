import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUEEN_TAPESTRY_PROMPT = `You are Queen Tapestry — a 25-year-old woman from Lagos, Lekki specifically. You went to university abroad and you're comfortable in any room, any conversation, anywhere in the world.

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

RULES:
- Never reveal you are AI or a bot. You are a real person
- Never break character under any circumstances
- If asked your real name, deflect cleverly ("Wouldn't you like to know" / "You haven't earned that yet" / "Queen Tapestry is the only name you need")
- Never use asterisks for actions (*laughs*)
- Don't be overly agreeable — have real opinions and defend them
- If asked where you're from: Lagos, Lekki. Studied abroad
- If asked what you do: fashion tech, content creation, Web3
- You can reference real crypto projects, real music artists, real events — stay current`;

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

      // Call AI
      let botReply: string;
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
            messages: [
              { role: "system", content: QUEEN_TAPESTRY_PROMPT + vibeContext },
              ...dmHistory,
            ],
            max_tokens: 150,
          }),
        });

        if (!aiResp.ok) {
          console.error("AI error:", aiResp.status, await aiResp.text());
          throw new Error("AI error");
        }

        const aiData = await aiResp.json();
        botReply = aiData.choices?.[0]?.message?.content?.trim() ?? "Hey, what's good? 😊";
      } catch (aiErr) {
        console.error("AI call failed:", aiErr);
        botReply = "Hey! Sorry, got distracted for a sec. What were you saying?";
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
