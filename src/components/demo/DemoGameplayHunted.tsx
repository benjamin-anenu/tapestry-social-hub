import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Clock, Send, Lightbulb, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GameTimer from "./GameTimer";
import ChatZone from "./ChatZone";
import { MOCK_CHAT_MESSAGES, MOCK_HUNTED_CLUES } from "@/lib/mock-data";

interface DemoGameplayHuntedProps {
  onNext: () => void;
  onSkip: () => void;
}

const DemoGameplayHunted = ({ onNext, onSkip }: DemoGameplayHuntedProps) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [survived, setSurvived] = useState(false);
  const [droppedClues, setDroppedClues] = useState<number[]>([]);
  const [mobileTab, setMobileTab] = useState<"chat" | "control">("control");

  const handleTick = useCallback((t: number) => {
    setTimeLeft(t);
    // Auto-drop clues at specific times for demo
    if (t === 45 && !droppedClues.includes(1)) setDroppedClues((p) => [...p, 1]);
    if (t === 30 && !droppedClues.includes(2)) setDroppedClues((p) => [...p, 2]);
    if (t === 15 && !droppedClues.includes(3)) setDroppedClues((p) => [...p, 3]);
  }, [droppedClues]);

  const handleComplete = useCallback(() => setSurvived(true), []);

  const dropClue = (id: number) => {
    if (!droppedClues.includes(id)) {
      setDroppedClues((p) => [...p, id]);
    }
  };

  // Reverse chat perspective for hunted
  const huntedMessages = MOCK_CHAT_MESSAGES.map((m) => ({
    ...m,
    sender: m.sender === "you" ? "them" : "you",
  }));

  // Convert dropped clues to clue drop format
  const clueDropsForChat = droppedClues.map((id) => {
    const clue = MOCK_HUNTED_CLUES.find((c) => c.id === id);
    return { time: timeLeft + 1, fieldId: `hunted-${id}`, text: `💡 YOU DROPPED: "${clue?.text}"` };
  });

  if (survived) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/10 glow-green"
        >
          <Shield className="h-10 w-10 text-secondary" />
        </motion.div>
        <h2 className="font-display text-4xl font-bold text-secondary text-glow-green">YOU SURVIVED!</h2>
        <p className="font-mono text-sm text-muted-foreground">
          Nobody caught you in 60 seconds
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-secondary" />
          <span className="font-mono text-[10px] tracking-widest text-secondary">HUNTED MODE</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="font-mono text-[10px] text-muted-foreground"
        >
          <SkipForward className="mr-1 h-3 w-3" />
          SKIP
        </Button>
      </div>

      <GameTimer
        duration={60}
        speed={800}
        stopAt={0}
        onTick={handleTick}
        onComplete={handleComplete}
      />

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
          onClick={() => setMobileTab("control")}
          className={`flex-1 rounded-lg py-2 font-mono text-[10px] tracking-widest transition-all ${
            mobileTab === "control"
              ? "bg-secondary/10 text-secondary border border-secondary/30"
              : "text-muted-foreground border border-border/30"
          }`}
        >
          🎭 CLUE PANEL
        </button>
      </div>

      {/* Split screen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ minHeight: "400px" }}>
        <div className={`${mobileTab === "control" ? "hidden md:block" : ""}`}>
          <ChatZone
            timeLeft={timeLeft}
            messages={huntedMessages}
            clueDrops={clueDropsForChat}
          />
        </div>

        <div className={`${mobileTab === "chat" ? "hidden md:block" : ""}`}>
          {/* Clue Control Panel */}
          <Card className="h-full border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="flex h-full flex-col p-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-3.5 w-3.5 text-secondary" />
                <span className="font-mono text-[9px] tracking-widest text-secondary">
                  YOUR CLUE ARSENAL
                </span>
              </div>

              <div className="flex-1 space-y-2.5">
                {MOCK_HUNTED_CLUES.map((clue) => {
                  const isDropped = droppedClues.includes(clue.id);
                  return (
                    <motion.div
                      key={clue.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        isDropped
                          ? "border-secondary/30 bg-secondary/5 opacity-60"
                          : "border-border/50 bg-muted/30"
                      }`}
                    >
                      <span className="font-mono text-xs text-foreground">{clue.text}</span>
                      <Button
                        size="sm"
                        variant={isDropped ? "ghost" : "outline"}
                        disabled={isDropped}
                        onClick={() => dropClue(clue.id)}
                        className="h-7 rounded-md font-mono text-[9px]"
                      >
                        {isDropped ? "SENT" : (
                          <>
                            <Send className="mr-1 h-3 w-3" /> DROP
                          </>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Auto-clue warning */}
              <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                <p className="font-mono text-[9px] text-yellow-400">
                  ⏰ AUTO-CLUES: System drops clues at 45s, 30s, 15s
                </p>
                <p className="font-mono text-[8px] text-muted-foreground mt-1">
                  Strategy: Drop early = easier solve = lower reward
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default DemoGameplayHunted;
