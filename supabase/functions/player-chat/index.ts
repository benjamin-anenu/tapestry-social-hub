import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { gameId, message, puzzleValues } = await req.json();
    if (!gameId || !message) {
      return new Response(JSON.stringify({ error: "gameId and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch current game
    const { data: game, error: gameErr } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameErr || !game) {
      return new Response(JSON.stringify({ error: "Game not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (game.status === "completed") {
      return new Response(JSON.stringify({ error: "Game already ended" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build puzzle context for AI
    const puzzleFields = (game.puzzle_fields as Array<{ id: string; label: string; answer: string }>) ?? [];
    let puzzleContext = "";
    const isWrongGuess = message === "__WRONG_GUESS__";
    
    if (puzzleValues && puzzleFields.length > 0) {
      const attempts = puzzleFields.map((f) => {
        const val = (puzzleValues as Record<string, string>)?.[f.id] ?? "";
        if (!val) return null;
        const isClose = f.answer.toLowerCase().includes(val.toLowerCase()) || 
                        val.toLowerCase().includes(f.answer.toLowerCase().slice(0, 3));
        const isCorrect = val.toLowerCase().trim() === f.answer.toLowerCase();
        return { label: f.label, value: val, isClose, isCorrect };
      }).filter(Boolean);
      
      const correctCount = attempts.filter((a) => a?.isCorrect).length;
      const closeCount = attempts.filter((a) => a?.isClose && !a?.isCorrect).length;
      
      if (isWrongGuess) {
        puzzleContext = `\n\nPUZZLE EVENT: The player just submitted a WRONG answer. They got ${correctCount}/${puzzleFields.length} fields right and ${closeCount} are close. React naturally — tease them, be relieved, or taunt depending on your role. Keep it short.`;
      } else if (closeCount > 0) {
        puzzleContext = `\n\nPUZZLE CONTEXT: The player has ${correctCount} correct fields and ${closeCount} close guesses. They're getting warm. React subtly — maybe show nervousness if hunted, or excitement if hunting.`;
      } else if (correctCount > 0) {
        puzzleContext = `\n\nPUZZLE CONTEXT: The player has ${correctCount} correct fields already. ${correctCount >= puzzleFields.length - 1 ? "They're VERY close to solving!" : "They're making progress."}`;
      }
    }

    // Append player message to chat_log (skip internal markers)
    const chatLog = (game.chat_log as Array<{ time: number; sender: string; text: string }>) ?? [];
    const timeLabel = Math.max(60 - chatLog.length * 3, 5);
    
    if (!isWrongGuess) {
      chatLog.push({ time: timeLabel, sender: "you", text: message });
      await supabase.from("games").update({ chat_log: chatLog }).eq("id", gameId);
    }

    // Find bot profile
    const { data: botProfile } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", [game.hunter_id, game.hunted_id])
      .eq("is_bot", true)
      .maybeSingle();

    if (!botProfile) {
      // No bot — just save the message (human vs human)
      return new Response(JSON.stringify({ status: "sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botName = botProfile.username ?? "Player2";
    const botIsHunted = botProfile.id === game.hunted_id;
    const botRole = botIsHunted ? "hunted" : game.role_mode === "duel" ? "duel" : "hunter";

    // Generate AI response
    const systemPrompt = `You are a real person playing an online identity-guessing game called Find60. Your in-game name is "${botName}".

CRITICAL RULES — you MUST follow ALL of these:
- You are a HUMAN player. Never hint, suggest, or imply that you are an AI, bot, or automated.
- Write like a real person texting in a game: short, casual, lowercase ok, use slang, emojis sparingly (1 in every 3-4 messages max), typos occasionally.
- Keep messages between 3-15 words. Never write paragraphs.
- Show personality: be competitive, playful, a little cocky, or nervous depending on the situation.
- React naturally to what the other player says — reference their messages directly.
- Vary your style — don't repeat patterns. Mix questions, reactions, taunts, and observations.
- Never mention being programmed, trained, or having algorithms.
- Never say things like "as an AI" or "I'm designed to" — that's an instant tell.
- Sound like a crypto/web3 native who plays competitive games.
- RESPOND TO WHAT THEY SAID. Don't ignore their message.

Your role: ${botRole}
${botRole === "hunted" ? "You're hiding. Be evasive, teasing, deflective. Don't give away real info." : ""}
${botRole === "hunter" ? "You're hunting. Ask probing questions, react to what they reveal." : ""}
${botRole === "duel" ? "It's a duel. Be strategic and competitive." : ""}
${puzzleContext}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...chatLog.map((m: { sender: string; text: string }) => ({
        role: m.sender === botName ? "assistant" : "user",
        content: m.text,
      })),
      {
        role: "user",
        content: "Generate your next reply. ONLY the message text, nothing else.",
      },
    ];

    let botReply = "";
    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          max_tokens: 50,
          temperature: 0.9,
        }),
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        botReply = data.choices?.[0]?.message?.content?.trim() ?? "";
        botReply = botReply.replace(/^["']|["']$/g, "").slice(0, 120);
      }
    } catch (err) {
      console.error("AI reply error:", err);
    }

    if (!botReply) {
      const fallbacks = ["lol", "hmm", "interesting...", "nice try", "😏", "keep going"];
      botReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Append bot reply
    const replyTimeLabel = Math.max(timeLabel - 2, 3);
    chatLog.push({ time: replyTimeLabel, sender: botName, text: botReply });
    await supabase.from("games").update({ chat_log: chatLog }).eq("id", gameId);

    return new Response(
      JSON.stringify({ status: "replied", botReply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("player-chat error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
