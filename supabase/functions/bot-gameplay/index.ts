import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bot puzzle field templates (themed identity data)
const botPuzzleFields: Record<string, Array<{
  id: string; label: string; placeholder: string; answer: string;
  clueText: string; unlockTime: number; isRequired: boolean;
}>> = {
  "Shadow Protocol": [
    { id: "firstName", label: "First Name", placeholder: "Enter name...", answer: "Shadow", clueText: "Not a real name, more of a concept", unlockTime: 55, isRequired: true },
    { id: "handle", label: "Handle", placeholder: "@...", answer: "@shadow_proto", clueText: "Has 'shadow' in it", unlockTime: 45, isRequired: true },
    { id: "location", label: "Location", placeholder: "City...", answer: "The Void", clueText: "Nowhere and everywhere", unlockTime: 35, isRequired: true },
    { id: "profession", label: "Profession", placeholder: "What they do...", answer: "Signal Jammer", clueText: "Works with interference", unlockTime: 25, isRequired: false },
    { id: "funFact", label: "Fun Fact", placeholder: "Something unique...", answer: "Never been found", clueText: "Undefeated record", unlockTime: 18, isRequired: false },
  ],
  GhostSignal: [
    { id: "firstName", label: "First Name", placeholder: "Enter name...", answer: "Ghost", clueText: "Spooky but digital", unlockTime: 55, isRequired: true },
    { id: "handle", label: "Handle", placeholder: "@...", answer: "@gh0st_sig", clueText: "Uses a zero instead of 'o'", unlockTime: 45, isRequired: true },
    { id: "location", label: "Location", placeholder: "City...", answer: "Between Blocks", clueText: "Lives in the blockchain gaps", unlockTime: 35, isRequired: true },
    { id: "profession", label: "Profession", placeholder: "What they do...", answer: "Data Phantom", clueText: "Works with disappearing data", unlockTime: 25, isRequired: false },
    { id: "funFact", label: "Fun Fact", placeholder: "Something unique...", answer: "Has zero transactions", clueText: "Leaves no trace", unlockTime: 18, isRequired: false },
  ],
  "Agent Viper": [
    { id: "firstName", label: "First Name", placeholder: "Enter name...", answer: "Viper", clueText: "Named after a snake", unlockTime: 55, isRequired: true },
    { id: "handle", label: "Handle", placeholder: "@...", answer: "@agent_viper", clueText: "Has 'agent' prefix", unlockTime: 45, isRequired: true },
    { id: "location", label: "Location", placeholder: "City...", answer: "The Grid", clueText: "Lives in digital space", unlockTime: 35, isRequired: true },
    { id: "profession", label: "Profession", placeholder: "What they do...", answer: "Graph Scanner", clueText: "Analyzes connections", unlockTime: 25, isRequired: false },
    { id: "funFact", label: "Fun Fact", placeholder: "Something unique...", answer: "87% find rate", clueText: "Almost never misses", unlockTime: 18, isRequired: false },
  ],
  NeonWraith: [
    { id: "firstName", label: "First Name", placeholder: "Enter name...", answer: "Neon", clueText: "Bright and colorful", unlockTime: 55, isRequired: true },
    { id: "handle", label: "Handle", placeholder: "@...", answer: "@neon_wraith", clueText: "Glows in the dark", unlockTime: 45, isRequired: true },
    { id: "location", label: "Location", placeholder: "City...", answer: "Neon City", clueText: "A cyberpunk dream", unlockTime: 35, isRequired: true },
    { id: "profession", label: "Profession", placeholder: "What they do...", answer: "Identity Tracer", clueText: "Follows data trails", unlockTime: 25, isRequired: false },
    { id: "funFact", label: "Fun Fact", placeholder: "Something unique...", answer: "Sees in the dark", clueText: "Enhanced visual processing", unlockTime: 18, isRequired: false },
  ],
  CipherPunk: [
    { id: "firstName", label: "First Name", placeholder: "Enter name...", answer: "Cipher", clueText: "Related to encryption", unlockTime: 55, isRequired: true },
    { id: "handle", label: "Handle", placeholder: "@...", answer: "@cipher_punk", clueText: "Old-school crypto reference", unlockTime: 45, isRequired: true },
    { id: "location", label: "Location", placeholder: "City...", answer: "Decentraland", clueText: "A virtual world", unlockTime: 35, isRequired: true },
    { id: "profession", label: "Profession", placeholder: "What they do...", answer: "Cryptographer", clueText: "Codes and ciphers", unlockTime: 25, isRequired: false },
    { id: "funFact", label: "Fun Fact", placeholder: "Something unique...", answer: "Wrote first on-chain puzzle", clueText: "Pioneer in puzzle design", unlockTime: 18, isRequired: false },
  ],
  DarkMatter: [
    { id: "firstName", label: "First Name", placeholder: "Enter name...", answer: "Dark", clueText: "Opposite of light", unlockTime: 55, isRequired: true },
    { id: "handle", label: "Handle", placeholder: "@...", answer: "@dark_matter", clueText: "Cosmic and invisible", unlockTime: 45, isRequired: true },
    { id: "location", label: "Location", placeholder: "City...", answer: "Event Horizon", clueText: "Edge of a black hole", unlockTime: 35, isRequired: true },
    { id: "profession", label: "Profession", placeholder: "What they do...", answer: "Data Analyst", clueText: "Crunches numbers", unlockTime: 25, isRequired: false },
    { id: "funFact", label: "Fun Fact", placeholder: "Something unique...", answer: "Invisible to scanners", clueText: "Can't be detected", unlockTime: 18, isRequired: false },
  ],
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate a human-like message using Lovable AI
async function generateBotMessage(
  apiKey: string,
  botName: string,
  botRole: string,
  conversationHistory: Array<{ sender: string; text: string }>,
  gameContext: string
): Promise<string> {
  const systemPrompt = `You are a real person playing an online identity-guessing game called Find60. Your in-game name is "${botName}".

CRITICAL RULES — you MUST follow ALL of these:
- You are a HUMAN player. Never hint, suggest, or imply that you are an AI, bot, or automated.
- Write like a real person texting in a game: short, casual, lowercase ok, use slang, emojis sparingly (1 in every 3-4 messages max), typos occasionally.
- Keep messages between 3-15 words. Never write paragraphs.
- Show personality: be competitive, playful, a little cocky, or nervous depending on the situation.
- React to the game state naturally (time pressure, clues dropping, etc).
- Vary your style — don't repeat patterns. Mix questions, reactions, taunts, and observations.
- Never mention being programmed, trained, or having algorithms.
- Never say things like "as an AI" or "I'm designed to" — that's an instant tell.
- Sound like a crypto/web3 native who plays competitive games.

Your role in this match: ${botRole}

${gameContext}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.sender === botName ? "assistant" : "user",
      content: m.text,
    })),
    {
      role: "user",
      content: "Generate your next message in the game chat. Reply with ONLY the message text, nothing else. No quotes, no labels, no explanation.",
    },
  ];

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 50,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      // Fallback to generic message
      return getGenericFallback(botRole);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return getGenericFallback(botRole);

    // Clean up — remove quotes if the model wrapped it
    return text.replace(/^["']|["']$/g, "").slice(0, 100);
  } catch (err) {
    console.error("AI generation error:", err);
    return getGenericFallback(botRole);
  }
}

function getGenericFallback(role: string): string {
  const fallbacks: Record<string, string[]> = {
    hunted: ["lol good luck", "you won't find me", "tick tock ⏰", "getting cold tbh"],
    hunter: ["hmm interesting", "i see patterns...", "narrowing it down", "almost got it"],
    duel: ["let's go", "game on 🎯", "not bad", "my turn"],
  };
  const pool = fallbacks[role] ?? fallbacks["duel"];
  return pool[Math.floor(Math.random() * pool.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { gameId } = await req.json();
    if (!gameId) {
      return new Response(JSON.stringify({ error: "gameId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch game with profiles
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

    // Find bot profile
    const { data: botProfile } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", [game.hunter_id, game.hunted_id])
      .eq("is_bot", true)
      .maybeSingle();

    if (!botProfile) {
      return new Response(JSON.stringify({ error: "No bot in this game" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botName = botProfile.username ?? "Player2";
    const botIsHunter = botProfile.id === game.hunter_id;
    const botIsHunted = botProfile.id === game.hunted_id;
    const isDuel = game.role_mode === "duel";
    const botRole = botIsHunted ? "hunted" : botIsHunter ? "hunter" : "duel";

    const puzzleFields = botPuzzleFields[botName] ?? botPuzzleFields["CipherPunk"];

    // Set game to in_progress
    await supabase
      .from("games")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", gameId);

    let chatLog: Array<{ time: number; sender: string; text: string }> = [];
    let cluesDropped: Array<{ time: number; fieldId: string; text: string }> = [];

    const appendChat = async (text: string, sender: string, timeLabel: number) => {
      chatLog.push({ time: timeLabel, sender, text });
      await supabase.from("games").update({ chat_log: chatLog }).eq("id", gameId);
    };

    const appendClue = async (field: typeof puzzleFields[0], timeLabel: number) => {
      cluesDropped.push({ time: timeLabel, fieldId: field.id, text: `💡 CLUE: ${field.clueText}` });
      await supabase.from("games").update({ clues_dropped: cluesDropped }).eq("id", gameId);
    };

    const getGameContext = (timeLabel: number) => {
      if (botRole === "hunted") {
        return `You're hiding. The hunter is trying to figure out your identity. You have ${timeLabel} seconds left to survive. Be evasive but natural — tease, deflect, be playful. Don't give away real info.`;
      } else if (botRole === "hunter") {
        return `You're hunting. You're trying to figure out someone's identity through conversation. ${timeLabel} seconds left. Ask probing questions, react to clues, sound like you're piecing things together.`;
      }
      return `It's a duel — you're both hunting and hiding. ${timeLabel} seconds left. Be strategic, competitive, and unpredictable.`;
    };

    const generateAndSend = async (timeLabel: number) => {
      const msg = await generateBotMessage(
        lovableApiKey, botName, botRole, chatLog, getGameContext(timeLabel)
      );
      await appendChat(msg, botName, timeLabel);
    };

    if (botIsHunted || isDuel) {
      // Bot is hunted — set puzzle fields and drip clues + AI chat
      await supabase.from("games").update({ puzzle_fields: puzzleFields }).eq("id", gameId);

      // Sequence: AI message, clue, AI message, clue, ...
      await sleep(1500 + Math.random() * 1000);
      await generateAndSend(58);

      await sleep(1500 + Math.random() * 1000);
      if (puzzleFields[0]) await appendClue(puzzleFields[0], 55);

      await sleep(2000 + Math.random() * 1500);
      await generateAndSend(52);

      await sleep(2000 + Math.random() * 1000);
      if (puzzleFields[1]) await appendClue(puzzleFields[1], 45);

      await sleep(1500 + Math.random() * 1500);
      await generateAndSend(42);

      await sleep(2500 + Math.random() * 1000);
      if (puzzleFields[2]) await appendClue(puzzleFields[2], 35);

      await sleep(2000 + Math.random() * 1000);
      await generateAndSend(30);

      await sleep(2000 + Math.random() * 1500);
      if (puzzleFields[3]) await appendClue(puzzleFields[3], 25);

      await sleep(2000 + Math.random() * 1000);
      await generateAndSend(20);

      // Check if game was already solved by the player
      const { data: currentGame } = await supabase
        .from("games").select("status").eq("id", gameId).single();

      if (currentGame?.status !== "completed") {
        await sleep(3000);
        await supabase.from("games").update({
          status: "completed", hunter_won: false, ended_at: new Date().toISOString(),
        }).eq("id", gameId);
      }
    }

    if (botIsHunter && !isDuel) {
      // Bot is hunter — AI-powered probing conversation
      await sleep(1500 + Math.random() * 1000);
      await generateAndSend(58);

      await sleep(2500 + Math.random() * 1500);
      await generateAndSend(52);

      await sleep(2000 + Math.random() * 1500);
      await generateAndSend(45);

      await sleep(2500 + Math.random() * 1000);
      await generateAndSend(38);

      await sleep(2000 + Math.random() * 1500);
      await generateAndSend(32);

      // Bot "solves" at a random point
      const solveDelay = 2000 + Math.random() * 3000;
      await sleep(solveDelay);

      const { data: currentGame } = await supabase
        .from("games").select("status").eq("id", gameId).single();

      if (currentGame?.status !== "completed") {
        const solveMsg = await generateBotMessage(
          lovableApiKey, botName, "hunter",
          chatLog,
          "You just figured out who they are! Send a triumphant message revealing you found them. Be excited but natural, like a real gamer who just won."
        );
        await appendChat(solveMsg, botName, 25);

        await supabase.from("games").update({
          status: "completed", hunter_won: true, solved_at: 25,
          ended_at: new Date().toISOString(),
        }).eq("id", gameId);
      }
    }

    return new Response(
      JSON.stringify({ status: "completed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("bot-gameplay error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
