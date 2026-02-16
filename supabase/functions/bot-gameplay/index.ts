import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Bot personality message banks
const botMessages: Record<string, { role: string; messages: string[] }> = {
  "Shadow Protocol": {
    role: "hunted",
    messages: [
      "You'll never find me.",
      "Getting warmer... or not.",
      "I'm always one step ahead.",
      "My signal is everywhere and nowhere.",
      "You're chasing a shadow.",
      "Think you know me? Think again.",
    ],
  },
  GhostSignal: {
    role: "hunted",
    messages: [
      "Signal lost.",
      "I exist between the blocks.",
      "Catch my shadow if you can.",
      "You're looking in the wrong chain.",
      "I was never here.",
      "Decrypting... just kidding.",
    ],
  },
  "Agent Viper": {
    role: "hunter",
    messages: [
      "Scanning your graph...",
      "I see your connections.",
      "Target acquired.",
      "Your wallet tells a story.",
      "Cross-referencing data...",
      "Almost got you.",
    ],
  },
  NeonWraith: {
    role: "hunter",
    messages: [
      "Your data trail glows.",
      "Processing identity matrix...",
      "Almost there.",
      "I can feel your transactions.",
      "Running pattern analysis...",
      "Narrowing it down.",
    ],
  },
  CipherPunk: {
    role: "duel",
    messages: [
      "Let's see who's faster.",
      "Encrypting my tracks.",
      "Your move.",
      "I solve puzzles for breakfast.",
      "Race you to the answer.",
      "Don't blink.",
    ],
  },
  DarkMatter: {
    role: "duel",
    messages: [
      "You can't see what isn't there.",
      "Running analysis...",
      "Interesting patterns.",
      "I'm already three steps ahead.",
      "The data doesn't lie.",
      "Impressive... but not enough.",
    ],
  },
};

// Bot puzzle field templates
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { gameId } = await req.json();
    if (!gameId) {
      return new Response(JSON.stringify({ error: "gameId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch game
    const { data: game, error: gameErr } = await supabase
      .from("games")
      .select("*, hunter:profiles!games_hunter_id_fkey(username), hunted:profiles!games_hunted_id_fkey(username)")
      .eq("id", gameId)
      .single();

    if (gameErr || !game) {
      return new Response(JSON.stringify({ error: "Game not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which player is the bot
    const hunterProfile = game.hunter as { username: string } | null;
    const huntedProfile = game.hunted as { username: string } | null;

    // Find which profile is a bot
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

    const botName = botProfile.username ?? "Bot";
    const botIsHunter = botProfile.id === game.hunter_id;
    const botIsHunted = botProfile.id === game.hunted_id;
    const isDuel = game.role_mode === "duel";

    const msgs = botMessages[botName]?.messages ?? botMessages["CipherPunk"].messages;
    const puzzleFields = botPuzzleFields[botName] ?? botPuzzleFields["CipherPunk"];

    // Update game to in_progress
    await supabase
      .from("games")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", gameId);

    let chatLog: Array<{ time: number; sender: string; text: string }> = [];
    let cluesDropped: Array<{ time: number; fieldId: string; text: string }> = [];
    let msgIndex = 0;

    // Helper to append chat
    const appendChat = async (text: string, sender: string, timeLabel: number) => {
      chatLog.push({ time: timeLabel, sender, text });
      await supabase
        .from("games")
        .update({ chat_log: chatLog })
        .eq("id", gameId);
    };

    // Helper to append clue
    const appendClue = async (field: typeof puzzleFields[0], timeLabel: number) => {
      cluesDropped.push({
        time: timeLabel,
        fieldId: field.id,
        text: `💡 CLUE: ${field.clueText}`,
      });
      await supabase
        .from("games")
        .update({ clues_dropped: cluesDropped })
        .eq("id", gameId);
    };

    if (botIsHunted || isDuel) {
      // Bot is the hunted — player is hunting
      // Set puzzle fields
      await supabase
        .from("games")
        .update({ puzzle_fields: puzzleFields })
        .eq("id", gameId);

      // Simulate behavior over ~15 seconds
      // t=0s: first message
      await sleep(2000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 58);

      // t=2s: clue 1
      await sleep(2000);
      if (puzzleFields[0]) await appendClue(puzzleFields[0], 55);

      // t=4s: message
      await sleep(2000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 53);

      // t=6s: clue 2
      await sleep(2500);
      if (puzzleFields[1]) await appendClue(puzzleFields[1], 45);

      // t=8.5s: message
      await sleep(2000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 42);

      // t=10.5s: clue 3
      await sleep(2500);
      if (puzzleFields[2]) await appendClue(puzzleFields[2], 35);

      // t=13s: message
      await sleep(2000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 30);

      // t=15s: final clue + end if not solved
      await sleep(2000);
      if (puzzleFields[3]) await appendClue(puzzleFields[3], 25);

      // Check if game was already solved by player
      const { data: currentGame } = await supabase
        .from("games")
        .select("status")
        .eq("id", gameId)
        .single();

      if (currentGame?.status !== "completed") {
        // Game time expired — hunted survived
        await supabase
          .from("games")
          .update({
            status: "completed",
            hunter_won: false,
            ended_at: new Date().toISOString(),
          })
          .eq("id", gameId);
      }
    }

    if (botIsHunter && !isDuel) {
      // Bot is the hunter — player is hiding
      // Simulate probing messages
      await sleep(2000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 58);

      await sleep(3000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 52);

      await sleep(3000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 45);

      await sleep(2000);
      if (msgs[msgIndex]) await appendChat(msgs[msgIndex++], botName, 40);

      // Bot "solves" at random time between 8-12 seconds
      const solveDelay = 2000 + Math.random() * 4000;
      await sleep(solveDelay);

      const { data: currentGame } = await supabase
        .from("games")
        .select("status")
        .eq("id", gameId)
        .single();

      if (currentGame?.status !== "completed") {
        await appendChat("Found you. 🎯", botName, 25);
        await supabase
          .from("games")
          .update({
            status: "completed",
            hunter_won: true,
            solved_at: 25,
            ended_at: new Date().toISOString(),
          })
          .eq("id", gameId);
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
