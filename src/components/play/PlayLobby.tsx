import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crosshair, Eye, Swords, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { TapestryProfile } from "@/hooks/useTapestryIdentity";
import GameArena from "./GameArena";

interface PlayLobbyProps {
  profile: TapestryProfile;
  profileId: string;
  walletAddress: string;
}

type Role = "hunter" | "hunted" | "duel";

const roles: { value: Role; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "hunter", label: "Hunter", icon: Crosshair, desc: "Track & find them" },
  { value: "hunted", label: "Hunted", icon: Eye, desc: "Hide & survive" },
  { value: "duel", label: "Duel", icon: Swords, desc: "Both hunt each other" },
];

const PlayLobby = ({ profile, profileId, walletAddress }: PlayLobbyProps) => {
  const [role, setRole] = useState<Role>("hunter");
  const [stake, setStake] = useState("0.01");
  const [searching, setSearching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [isBot, setIsBot] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [showArena, setShowArena] = useState(false);

  // Listen for match via Realtime
  useEffect(() => {
    if (!queueId) return;

    const channel = supabase
      .channel(`queue-${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matchmaking_queue",
          filter: `id=eq.${queueId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as Record<string, unknown>).status === "matched") {
            setMatchStatus("matched");
            setSearching(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueId]);

  const findMatch = async () => {
    setSearching(true);
    setMatchStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke("matchmaking", {
        body: { profileId, walletAddress, role, stakeAmount: parseFloat(stake) || 0.01 },
      });

      if (error) throw error;

      if (data.status === "matched") {
        setMatchStatus("matched");
        setIsBot(data.isBot === true);
        setGameId(data.gameId);
        setSearching(false);
        // Auto-transition to arena after 2 seconds
        setTimeout(() => setShowArena(true), 2000);
      } else {
        setQueueId(data.queueId);
        setMatchStatus("waiting");
      }
    } catch (err) {
      console.error("Matchmaking error:", err);
      setSearching(false);
      setMatchStatus("error");
    }
  };

  // Show GameArena after transition
  if (showArena && gameId) {
    return (
      <GameArena
        gameId={gameId}
        role={role}
        isBot={isBot}
        walletAddress={walletAddress}
      />
    );
  }

  if (matchStatus === "matched") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 rounded-2xl border border-secondary/30 bg-card/80 p-8 backdrop-blur-sm glow-green"
      >
        <Swords className="h-12 w-12 text-secondary" />
        <h2 className="font-display text-2xl font-bold text-foreground">Match Found!</h2>
        {isBot && (
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
            vs AI Agent
          </span>
        )}
        <p className="font-mono text-sm text-muted-foreground">Preparing the arena...</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-md flex-col gap-6"
    >
      {/* Role Select */}
      <div className="grid grid-cols-3 gap-3">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
              role === r.value
                ? "border-primary/50 bg-primary/10 glow-blue"
                : "border-border/30 bg-card/50 hover:border-border/60"
            }`}
          >
            <r.icon className={`h-6 w-6 ${role === r.value ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`font-display text-sm font-bold ${role === r.value ? "text-foreground" : "text-muted-foreground"}`}>
              {r.label}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">{r.desc}</span>
          </button>
        ))}
      </div>

      {/* Stake Input */}
      <div className="flex flex-col gap-2">
        <label className="font-mono text-xs text-muted-foreground">Bounty Stake (SOL)</label>
        <Input
          type="number"
          min="0.01"
          max="1.0"
          step="0.01"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="rounded-xl border-border/50 bg-muted/50 font-mono"
        />
      </div>

      {/* Find Match */}
      <Button
        onClick={findMatch}
        disabled={searching}
        className="h-14 rounded-xl font-display text-lg font-bold shadow-lg glow-blue"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        {searching ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-5 w-5" />
            Find Match
          </>
        )}
      </Button>

      {matchStatus === "waiting" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center font-mono text-xs text-muted-foreground"
        >
          In queue — waiting for an opponent...
        </motion.p>
      )}

      {matchStatus === "error" && (
        <p className="text-center font-mono text-xs text-destructive">
          Something went wrong. Please try again.
        </p>
      )}
    </motion.div>
  );
};

export default PlayLobby;
