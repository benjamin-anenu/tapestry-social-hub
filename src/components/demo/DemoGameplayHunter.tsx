import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameTimer from "./GameTimer";
import ChatZone from "./ChatZone";
import PuzzleZone from "./PuzzleZone";
import BountyTracker from "./BountyTracker";
import { MOCK_CHAT_MESSAGES, MOCK_CLUE_DROPS, MOCK_MATCH_RESULT, MOCK_PUZZLE_FIELDS } from "@/lib/mock-data";

interface DemoGameplayHunterProps {
  onNext: () => void;
}

const DemoGameplayHunter = ({ onNext }: DemoGameplayHunterProps) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [found, setFound] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "puzzle">("puzzle");

  const foundTime = 60 - MOCK_MATCH_RESULT.foundInSeconds;
  const cluesRevealed = MOCK_CLUE_DROPS.filter((c) => timeLeft <= c.time).length;

  const handleTick = useCallback((t: number) => setTimeLeft(t), []);
  const handleSolve = useCallback(() => setFound(true), []);

  if (found) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/10 glow-green"
        >
          <Crosshair className="h-10 w-10 text-secondary" />
        </motion.div>
        <h2 className="font-display text-5xl font-bold text-secondary text-glow-green">FOUND!</h2>
        <p className="font-mono text-sm text-muted-foreground">
          TARGET LOCATED IN{" "}
          <span className="font-bold text-secondary">{MOCK_MATCH_RESULT.foundInSeconds}s</span>
        </p>
        <Button
          size="lg"
          onClick={onNext}
          className="h-12 w-full max-w-xs rounded-xl bg-primary font-display font-bold text-primary-foreground glow-blue"
        >
          VIEW RESULTS
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex w-full max-w-4xl flex-col gap-3"
    >
      {/* Timer + Bounty */}
      <GameTimer
        duration={60}
        speed={600}
        stopAt={foundTime}
        onTick={handleTick}
        onComplete={handleSolve}
      />
      <BountyTracker timeLeft={timeLeft} cluesRevealed={cluesRevealed} totalClues={MOCK_PUZZLE_FIELDS.length} />

      {/* Mobile tabs */}
      <div className="flex gap-1 md:hidden">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 rounded-lg py-2 font-mono text-[10px] tracking-widest transition-all ${
            mobileTab === "chat"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground border border-border/30"
          }`}
        >
          💬 COMMS
        </button>
        <button
          onClick={() => setMobileTab("puzzle")}
          className={`flex-1 rounded-lg py-2 font-mono text-[10px] tracking-widest transition-all ${
            mobileTab === "puzzle"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground border border-border/30"
          }`}
        >
          🎯 PUZZLE
        </button>
      </div>

      {/* Split screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ minHeight: "400px" }}>
        {/* Chat Zone - hidden on mobile when puzzle tab active */}
        <div className={`${mobileTab === "puzzle" ? "hidden md:block" : ""}`}>
          <ChatZone
            timeLeft={timeLeft}
            messages={MOCK_CHAT_MESSAGES}
            clueDrops={MOCK_CLUE_DROPS}
          />
        </div>

        {/* Puzzle Zone - hidden on mobile when chat tab active */}
        <div className={`${mobileTab === "chat" ? "hidden md:block" : ""}`}>
          <PuzzleZone
            timeLeft={timeLeft}
            onSolve={handleSolve}
            autoSolveAt={foundTime}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DemoGameplayHunter;
