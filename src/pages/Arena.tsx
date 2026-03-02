import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Flame, Gamepad2, Lock, Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GameOption {
  title: string;
  desc: string;
  icon: React.ElementType;
  path: string;
  gradient: string;
  disabled: boolean;
}

const games: GameOption[] = [
  {
    title: "Chicken 🔥",
    desc: "Stake SOL, counter climbs to 100 — cash out first or lose it all",
    icon: Flame,
    path: "/play/chicken",
    gradient: "var(--gradient-danger)",
    disabled: false,
  },
  {
    title: "Puzzle Duel",
    desc: "Challenge a friend to a staked puzzle race",
    icon: Swords,
    path: "/play/arena/duel",
    gradient: "var(--gradient-primary)",
    disabled: true,
  },
];

const Arena = () => {
  const navigate = useNavigate();

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
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
            PICK YOUR GAME
          </p>
        </motion.div>

        {/* Game list */}
        <div className="flex flex-col gap-3">
          {games.map((game, i) => (
            <motion.button
              key={game.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              onClick={() => !game.disabled && navigate(game.path)}
              disabled={game.disabled}
              className={`group relative flex items-center gap-4 rounded-2xl border border-border/50 bg-card/80 p-5 text-left backdrop-blur-sm transition-all ${
                game.disabled
                  ? "cursor-not-allowed opacity-50"
                  : "hover:border-destructive/30"
              }`}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundImage: game.gradient }}
              >
                {game.disabled ? (
                  <Lock className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <game.icon className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
              <div className="flex flex-1 flex-col items-start gap-0.5">
                <span className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  {game.title}
                  {game.disabled && (
                    <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[9px] uppercase tracking-wider">
                      Coming Soon
                    </Badge>
                  )}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground w-full text-left">
                  {game.desc}
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Back */}
        <Button variant="ghost" onClick={() => navigate("/play")} className="mx-auto text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
        </Button>
      </div>
    </div>
  );
};

export default Arena;
