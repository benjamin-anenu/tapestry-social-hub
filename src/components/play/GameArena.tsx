import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import GameTimer from "@/components/demo/GameTimer";
import ChatZone from "@/components/demo/ChatZone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Eye, Lock, Unlock, AlertTriangle, Lightbulb,
  Trophy, Shield, Skull, MessageCircle,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface GameArenaProps {
  gameId: string;
  role: "hunter" | "hunted" | "duel";
  isBot: boolean;
  walletAddress: string;
}

interface PuzzleField {
  id: string;
  label: string;
  placeholder: string;
  answer: string;
  clueText: string;
  unlockTime: number;
  isRequired: boolean;
}

interface ChatMessage {
  time: number;
  sender: string;
  text: string;
}

interface ClueDropMessage {
  time: number;
  fieldId: string;
  text: string;
}

interface GameRow {
  id: string;
  status: string;
  hunter_won: boolean | null;
  chat_log: Json;
  clues_dropped: Json;
  puzzle_fields: Json;
  started_at: string | null;
  ended_at: string | null;
  bounty_total: number | null;
  solved_at: number | null;
  is_bot_game: boolean;
}

const GameArena = ({ gameId, role, isBot, walletAddress }: GameArenaProps) => {
  const [game, setGame] = useState<GameRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [values, setValues] = useState<Record<string, string>>({});
  const [wrongGuess, setWrongGuess] = useState(false);
  const [solved, setSolved] = useState(false);
  const [botTriggered, setBotTriggered] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);

  const chatLog = (game?.chat_log as unknown as ChatMessage[]) ?? [];
  const cluesDropped = (game?.clues_dropped as unknown as ClueDropMessage[]) ?? [];
  const puzzleFields = (game?.puzzle_fields as unknown as PuzzleField[]) ?? [];

  // Fetch initial game state
  useEffect(() => {
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (!error && data) {
        setGame(data as unknown as GameRow);
      }
      setLoading(false);
    };
    fetchGame();
  }, [gameId]);

  // Subscribe to Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.new) {
            setGame(payload.new as unknown as GameRow);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Trigger bot gameplay
  useEffect(() => {
    if (isBot && game && !botTriggered) {
      setBotTriggered(true);
      supabase.functions.invoke("bot-gameplay", {
        body: { gameId },
      }).catch((err) => console.error("Bot gameplay error:", err));
    }
  }, [isBot, game, botTriggered, gameId]);

  const handleTick = useCallback((t: number) => {
    setTimeLeft(t);
  }, []);

  const handleTimerComplete = useCallback(async () => {
    if (game?.status !== "completed") {
      await supabase.functions.invoke("bot-gameplay", {
        body: { gameId, action: "timeout" },
      }).catch(() => {});
    }
  }, [game?.status, gameId]);

  const handleSendChat = useCallback(async (text: string) => {
    if (sendingChat) return;
    setSendingChat(true);
    try {
      await supabase.functions.invoke("player-chat", {
        body: { gameId, message: text },
      });
    } catch (err) {
      console.error("Send chat error:", err);
    } finally {
      setSendingChat(false);
    }
  }, [gameId, sendingChat]);

  const handleSubmit = async () => {
    const allCorrect = puzzleFields
      .filter((f) => f.isRequired)
      .every((f) => values[f.id]?.toLowerCase().trim() === f.answer.toLowerCase());

    if (allCorrect) {
      setSolved(true);
      // Update game as solved
      await supabase
        .from("games")
        .update({
          status: "completed",
          hunter_won: true,
          solved_at: timeLeft,
          ended_at: new Date().toISOString(),
        })
        .eq("id", gameId);
    } else {
      setWrongGuess(true);
      setTimeout(() => setWrongGuess(false), 600);
    }
  };

  const isCompleted = game?.status === "completed";
  const hunterWon = game?.hunter_won;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Game Over screen
  if (isCompleted) {
    const playerWon =
      (role === "hunter" && hunterWon) || (role === "hunted" && !hunterWon);
    const Icon = playerWon ? Trophy : Skull;
    const title = playerWon
      ? role === "hunter"
        ? "TARGET FOUND!"
        : "YOU SURVIVED!"
      : role === "hunter"
      ? "TARGET ESCAPED"
      : "YOU WERE CAUGHT";

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 rounded-2xl border border-secondary/30 bg-card/80 p-8 backdrop-blur-sm"
      >
        <Icon
          className={`h-16 w-16 ${playerWon ? "text-secondary" : "text-destructive"}`}
        />
        <h2 className="font-display text-3xl font-bold text-foreground">{title}</h2>
        {game.solved_at && (
          <p className="font-mono text-sm text-muted-foreground">
            Solved at {game.solved_at}s remaining
          </p>
        )}
        {game.bounty_total && (
          <div className="flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
            <span className="font-mono text-lg font-bold text-secondary">
              {playerWon ? "+" : "-"}{game.bounty_total} SOL
            </span>
          </div>
        )}
        <Button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl font-display"
          variant="outline"
        >
          Play Again
        </Button>
      </motion.div>
    );
  }

  // Active gameplay
  const isHunter = role === "hunter" || role === "duel";

  // Convert clues/messages to time-based format for ChatZone
  // ChatZone expects timeLeft <= m.time to show, but our live data uses absolute times
  // We pass messages as-is since they use the same format
  const liveChatMessages = chatLog.map((m) => ({
    time: m.time,
    sender: m.sender,
    text: m.text,
  }));

  const liveClueDrops = cluesDropped.map((c) => ({
    time: c.time,
    fieldId: c.fieldId,
    text: c.text,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex w-full max-w-4xl flex-col gap-4"
    >
      {/* Timer */}
      <GameTimer
        duration={60}
        speed={1000}
        onTick={handleTick}
        onComplete={handleTimerComplete}
      />

      {/* Role badge */}
      <div className="flex justify-center">
        <span
          className={`rounded-full border px-3 py-1 font-mono text-xs ${
            role === "hunter"
              ? "border-primary/30 bg-primary/10 text-primary"
              : role === "hunted"
              ? "border-secondary/30 bg-secondary/10 text-secondary"
              : "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
          }`}
        >
          {role.toUpperCase()}
          {isBot && " vs AI"}
        </span>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ minHeight: 400 }}>
        {/* Chat */}
        <ChatZone
          timeLeft={timeLeft}
          messages={liveChatMessages}
          clueDrops={liveClueDrops}
          onSendMessage={handleSendChat}
          disabled={sendingChat || isCompleted}
        />

        {/* Puzzle Zone (Hunter) or Status (Hunted) */}
        {isHunter ? (
          <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[9px] tracking-widest text-primary">
                  SOLVE THE PUZZLE
                </span>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground">
                💡 {puzzleFields.filter((f) => timeLeft <= f.unlockTime).length}/
                {puzzleFields.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {puzzleFields.map((field) => {
                const isUnlocked = timeLeft <= field.unlockTime;
                return (
                  <motion.div
                    key={field.id}
                    layout
                    className={`rounded-lg border p-3 transition-all ${
                      isUnlocked
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/30 bg-muted/20 opacity-50"
                    } ${wrongGuess && isUnlocked ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-mono text-[10px] tracking-wider text-muted-foreground">
                        {field.label.toUpperCase()}
                        {field.isRequired && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </label>
                      {isUnlocked ? (
                        <Unlock className="h-3 w-3 text-secondary" />
                      ) : (
                        <Lock className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </div>
                    {isUnlocked ? (
                      <>
                        <Input
                          value={values[field.id] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              [field.id]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="h-8 border-primary/20 bg-background/50 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50"
                          disabled={solved}
                        />
                        <p className="mt-1 font-mono text-[9px] text-primary/70">
                          Clue: "{field.clueText}"
                        </p>
                      </>
                    ) : (
                      <div className="flex h-8 items-center rounded-md border border-border/20 bg-muted/30 px-3">
                        <span className="font-mono text-[10px] text-muted-foreground/40">
                          🔒 LOCKED — awaiting intel
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {puzzleFields.length === 0 && (
                <p className="py-8 text-center font-mono text-xs text-muted-foreground italic">
                  Waiting for puzzle data...
                </p>
              )}
            </div>

            <AnimatePresence>
              {wrongGuess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="font-mono text-xs font-bold text-destructive">
                    WRONG ANSWER
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-border/50 p-4">
              <Button
                onClick={handleSubmit}
                disabled={
                  !puzzleFields
                    .filter((f) => f.isRequired)
                    .every((f) => (values[f.id] ?? "").trim().length > 0) ||
                  solved
                }
                className="h-10 w-full rounded-lg bg-primary font-mono text-xs font-bold text-primary-foreground glow-blue disabled:opacity-30"
              >
                {solved ? "✓ SUBMITTED" : "SUBMIT ANSWER"}
              </Button>
            </div>
          </div>
        ) : (
          /* Hunted player view — clue control / status */
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
            <Shield className="h-12 w-12 text-secondary" />
            <h3 className="font-display text-xl font-bold text-foreground">
              Stay Hidden
            </h3>
            <p className="text-center font-mono text-xs text-muted-foreground">
              The hunter is searching for you. Survive until time runs out!
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2">
              <span className="font-mono text-sm font-bold text-secondary">
                {timeLeft}s remaining
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GameArena;
