import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bot, Gamepad2, Loader2, Swords, Trophy, Users, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import GameArena from "@/components/play/GameArena";

interface FriendOption {
  id: string;
  username: string | null;
  display_name: string | null;
  city: string | null;
  vibe_score: number | null;
}

type Phase = "pick-friend" | "set-stake" | "waiting" | "playing";

const Arena = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [phase, setPhase] = useState<Phase>("pick-friend");
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<FriendOption | null>(null);
  const [stakeAmount, setStakeAmount] = useState("0.01");
  const [matchError, setMatchError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isBot, setIsBot] = useState(false);

  // Fetch mutual friends
  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;

    const fetchFriends = async () => {
      setLoading(true);
      try {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("wallet_address", walletAddress)
          .single();

        if (!myProfile || cancelled) { setLoading(false); return; }

        const { data: friendships } = await supabase
          .from("friendships")
          .select("follower_id, following_id")
          .eq("mutual", true)
          .or(`follower_id.eq.${myProfile.id},following_id.eq.${myProfile.id}`);

        if (!friendships?.length || cancelled) { setLoading(false); return; }

        const friendIds = friendships.map((f) =>
          f.follower_id === myProfile.id ? f.following_id : f.follower_id
        );

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, city, vibe_score")
          .in("id", friendIds);

        if (!cancelled) setFriends(profiles ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFriends();
    return () => { cancelled = true; };
  }, [walletAddress]);

  const handleStartMatch = useCallback(async (practiceMode = false) => {
    if (!walletAddress) return;
    if (!practiceMode && !selectedFriend) return;
    setPhase("waiting");
    setMatchError(null);

    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: {
          walletAddress,
          role: "duel",
          stakeAmount: practiceMode ? 0 : (parseFloat(stakeAmount) || 0.01),
        },
      });

      if (error) throw error;

      if (data?.gameId) {
        setGameId(data.gameId);
        setIsBot(data.isBot ?? false);
        setPhase("playing");
      } else {
        setMatchError("Could not create a match. Try again.");
        setPhase(practiceMode ? "pick-friend" : "set-stake");
      }
    } catch {
      setMatchError("Matchmaking failed. Please try again.");
      setPhase(practiceMode ? "pick-friend" : "set-stake");
    }
  }, [walletAddress, selectedFriend, stakeAmount]);

  // Playing phase — hand off to GameArena
  if (phase === "playing" && gameId && walletAddress) {
    return (
      <div className="relative flex min-h-screen flex-col items-center bg-background grid-bg overflow-hidden scanlines">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-destructive/5 blur-[150px]" />
        </div>
        <div className="relative z-10 flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
          <GameArena gameId={gameId} role="duel" isBot={isBot} walletAddress={walletAddress} />
          <Button variant="ghost" onClick={() => navigate("/play")} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Leave Arena
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-background grid-bg overflow-hidden scanlines">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-destructive/5 blur-[150px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <Gamepad2 className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Game <span className="text-destructive">Arena</span>
          </h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* PICK FRIEND */}
          {phase === "pick-friend" && (
            <motion.div key="pick" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <p className="text-center font-mono text-[10px] tracking-widest text-muted-foreground">
                SELECT AN OPPONENT
              </p>

              {loading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="font-mono text-xs text-muted-foreground">Loading your circle...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30" />
                  <p className="max-w-xs font-mono text-xs leading-relaxed text-muted-foreground">
                    No mutual friends yet. Make connections first, or practice against an AI bot!
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Button
                      onClick={() => handleStartMatch(true)}
                      className="gap-2 font-display font-bold"
                      style={{ backgroundImage: "var(--gradient-danger)" }}
                    >
                      <Bot className="h-4 w-4" /> Practice vs AI
                    </Button>
                    <Button
                      onClick={() => navigate("/play/vibe")}
                      variant="outline"
                      className="gap-2 font-mono text-xs border-border/50"
                    >
                      <Zap className="h-4 w-4" /> Start Vibing Instead
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {friends.map((f) => (
                    <motion.button
                      key={f.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => {
                        setSelectedFriend(f);
                        setPhase("set-stake");
                      }}
                      className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-4 text-left backdrop-blur-sm transition-all hover:border-destructive/30"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 font-display text-lg font-bold text-destructive">
                        {(f.username ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span className="font-display text-sm font-bold text-foreground">
                          {f.username ?? f.display_name ?? "Unknown"}
                        </span>
                        {f.city && (
                          <span className="font-mono text-[10px] text-muted-foreground">{f.city}</span>
                        )}
                      </div>
                      {f.vibe_score != null && (
                        <span className="font-mono text-[10px] text-secondary">
                          ⚡ {f.vibe_score}
                        </span>
                      )}
                      <Swords className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
                    </motion.button>
                  ))}
                  {/* Practice mode option */}
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleStartMatch(true)}
                    className="group flex items-center gap-3 rounded-xl border border-dashed border-border/50 bg-card/40 p-4 text-left backdrop-blur-sm transition-all hover:border-primary/30"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-lg font-bold text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="font-display text-sm font-bold text-foreground">Practice vs AI</span>
                      <span className="font-mono text-[10px] text-muted-foreground">No stakes · Sharpen your skills</span>
                    </div>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* SET STAKE */}
          {phase === "set-stake" && selectedFriend && (
            <motion.div key="stake" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-4 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 font-display text-lg font-bold text-destructive">
                  {(selectedFriend.username ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold text-foreground">
                    vs {selectedFriend.username ?? selectedFriend.display_name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">Puzzle Duel</span>
                </div>
              </div>

              <div className="flex w-full max-w-xs flex-col gap-2">
                <label className="font-mono text-[10px] tracking-widest text-muted-foreground">
                  STAKE AMOUNT (SOL)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="h-12 border-border/50 bg-card/80 font-mono text-lg text-foreground text-center"
                />
                <p className="font-mono text-[9px] text-muted-foreground text-center">
                  Devnet SOL · Winner takes all
                </p>
              </div>

              {matchError && (
                <p className="font-mono text-xs text-destructive">{matchError}</p>
              )}

              <Button
                onClick={() => handleStartMatch(false)}
                className="h-14 w-full max-w-xs gap-2 rounded-xl font-display text-lg font-bold shadow-lg"
                style={{ backgroundImage: "var(--gradient-danger)" }}
              >
                <Swords className="h-5 w-5" /> CHALLENGE
              </Button>

              <Button
                variant="ghost"
                onClick={() => { setSelectedFriend(null); setPhase("pick-friend"); }}
                className="text-muted-foreground font-mono text-xs"
              >
                ← Pick someone else
              </Button>
            </motion.div>
          )}

          {/* WAITING */}
          {phase === "waiting" && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-destructive" />
              <h2 className="font-display text-xl font-bold text-foreground">Setting up the arena...</h2>
              <p className="font-mono text-xs text-muted-foreground">Creating match & generating puzzle</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back */}
        {phase !== "waiting" && (
          <Button variant="ghost" onClick={() => navigate("/play")} className="mx-auto text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
          </Button>
        )}
      </div>
    </div>
  );
};

export default Arena;
