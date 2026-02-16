import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MessageCircle, Eye, Crosshair } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MOCK_GAME_CLUES, MOCK_CHAT_MESSAGES, MOCK_MATCH_RESULT } from "@/lib/mock-data";

interface DemoGameplayProps {
  onNext: () => void;
}

const DemoGameplay = ({ onNext }: DemoGameplayProps) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [found, setFound] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const visibleClues = MOCK_GAME_CLUES.filter((c) => timeLeft <= c.time);
  const visibleMessages = MOCK_CHAT_MESSAGES.filter((m) => timeLeft <= m.time);
  const foundTime = 60 - MOCK_MATCH_RESULT.foundInSeconds;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= foundTime) {
          clearInterval(timerRef.current);
          setFound(true);
          return prev;
        }
        return prev - 1;
      });
    }, 600);
    return () => clearInterval(timerRef.current);
  }, []);

  const isUrgent = timeLeft <= 15;
  const isWarning = timeLeft <= 30 && !isUrgent;

  if (found) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="flex w-full max-w-md flex-col items-center gap-6 text-center"
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
      exit={{ opacity: 0, y: -20 }}
      className="flex w-full max-w-md flex-col gap-4"
    >
      {/* Timer */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <Clock className={`h-4 w-4 ${isUrgent ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary"}`} />
          <motion.span
            key={timeLeft}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-mono text-6xl font-bold tabular-nums ${
              isUrgent ? "text-destructive text-glow-red animate-countdown-pulse" : isWarning ? "text-yellow-500" : "text-foreground text-glow-blue"
            }`}
            style={isUrgent ? { textShadow: "0 0 20px hsla(340, 100%, 50%, 0.5)" } : {}}
          >
            {timeLeft}
          </motion.span>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">SEC</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isUrgent
                ? "var(--gradient-danger)"
                : "var(--gradient-primary)",
              width: `${(timeLeft / 60) * 100}%`,
              boxShadow: isUrgent
                ? "0 0 10px hsla(340, 100%, 50%, 0.5)"
                : "0 0 10px hsla(220, 100%, 50%, 0.3)",
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Clues */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Eye className="h-3 w-3 text-primary" />
            <span className="font-mono text-[9px] tracking-widest text-primary">CLUES</span>
          </div>
          <div className="space-y-1.5">
            <AnimatePresence>
              {visibleClues.map((clue) => (
                <motion.div
                  key={clue.time}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-border/50 bg-muted/50 px-3 py-2 font-mono text-xs text-foreground"
                >
                  {clue.text}
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleClues.length === 0 && (
              <p className="font-mono text-[10px] text-muted-foreground italic">
                AWAITING INTEL...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle className="h-3 w-3 text-primary" />
            <span className="font-mono text-[9px] tracking-widest text-primary">COMMS</span>
          </div>
          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            <AnimatePresence>
              {visibleMessages.map((msg) => (
                <motion.div
                  key={msg.time + msg.sender}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-1.5 font-mono text-xs ${
                      msg.sender === "you"
                        ? "bg-primary/20 text-primary border border-primary/20"
                        : "bg-muted/50 text-foreground border border-border/50"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleMessages.length === 0 && (
              <p className="font-mono text-[10px] text-muted-foreground italic">
                CHANNEL OPEN...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DemoGameplay;
