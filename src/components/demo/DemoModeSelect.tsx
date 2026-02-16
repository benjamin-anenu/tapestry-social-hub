import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Ghost, Zap, Loader2, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MOCK_OPPONENT, MOCK_BOUNTY } from "@/lib/mock-data";

interface DemoModeSelectProps {
  onNext: () => void;
}

type Phase = "select" | "matching" | "matched";

const modes = [
  {
    id: "hunter",
    label: "HUNTER",
    icon: Crosshair,
    desc: "Prove you can find me in 60 seconds",
    matchText: "Matched with → Hunted",
    tag: "REC",
  },
  {
    id: "hunted",
    label: "HUNTED",
    icon: Ghost,
    desc: "Make them work to know you",
    matchText: "Matched with → Hunter",
    tag: null,
  },
  {
    id: "duel",
    label: "DUEL",
    icon: Zap,
    desc: "Find each other — first wins",
    matchText: "Matched with → Duel",
    tag: null,
  },
];

const DemoModeSelect = ({ onNext }: DemoModeSelectProps) => {
  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState("hunter");

  const handlePlay = () => {
    setPhase("matching");
    setTimeout(() => setPhase("matched"), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex w-full max-w-md flex-col items-center gap-6"
    >
      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div
            key="select"
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <div className="text-center space-y-1">
              <h2 className="font-display text-2xl font-bold text-foreground">SELECT MODE</h2>
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                CHOOSE YOUR PLAY STYLE
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selected === mode.id;
                return (
                  <motion.div key={mode.id} whileTap={{ scale: 0.98 }}>
                    <Card
                      className={`cursor-pointer border transition-all ${
                        isSelected
                          ? "border-primary/50 bg-primary/5 glow-blue"
                          : "border-border/50 bg-card/50 hover:border-primary/20"
                      }`}
                      onClick={() => setSelected(mode.id)}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
                            isSelected
                              ? "border-primary/50 bg-primary/20 text-primary"
                              : "border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-base font-bold text-foreground">
                              {mode.label}
                            </span>
                            {mode.tag && (
                              <span className="rounded border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-secondary">
                                {mode.tag}
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-muted-foreground">{mode.desc}</p>
                          <p className="font-mono text-[9px] text-primary/60 mt-0.5">{mode.matchText}</p>
                        </div>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsla(220,100%,50%,0.5)]" />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <Button
              size="lg"
              onClick={handlePlay}
              className="h-12 w-full rounded-xl bg-primary font-display font-bold text-primary-foreground glow-blue"
            >
              FIND MATCH
            </Button>
          </motion.div>
        )}

        {phase === "matching" && (
          <motion.div
            key="matching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-12"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="h-16 w-16 rounded-2xl border-2 border-primary border-t-transparent"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="font-display text-lg font-bold text-foreground">MATCHING</p>
              <p className="font-mono text-[10px] tracking-wider text-primary animate-pulse">
                SCANNING TAPESTRY SOCIAL GRAPH
              </p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "matched" && (
          <motion.div
            key="matched"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="font-display text-xl font-bold text-secondary text-glow-green"
            >
              MATCH FOUND
            </motion.p>

            <Card className="w-full border-secondary/20 bg-card/80 backdrop-blur-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <Avatar className="h-14 w-14 rounded-xl border-2 border-secondary/30">
                  <AvatarImage src={MOCK_OPPONENT.avatar} />
                  <AvatarFallback className="rounded-xl bg-muted font-mono text-xs">AH</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-foreground">
                    {MOCK_OPPONENT.displayName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{MOCK_OPPONENT.username}</p>
                  <div className="mt-1.5 flex gap-2">
                    <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                      FIND {MOCK_OPPONENT.findRate}%
                    </span>
                    <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                      VIBE {MOCK_OPPONENT.vibeScore}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bounty preview */}
            <div className="flex w-full items-center justify-between rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-secondary" />
                <span className="font-mono text-[10px] text-secondary tracking-widest">BOUNTY POOL</span>
              </div>
              <span className="font-mono text-sm font-bold text-secondary">0.05 SOL</span>
            </div>

            <Button
              size="lg"
              onClick={onNext}
              className="h-12 w-full rounded-xl bg-primary font-display font-bold text-primary-foreground glow-blue"
            >
              START HUNT
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DemoModeSelect;
