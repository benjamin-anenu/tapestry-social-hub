import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MessageCircle, Eye, Trophy } from "lucide-react";
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
    }, 600); // faster than real-time for demo
    return () => clearInterval(timerRef.current);
  }, []);

  const timerColor = timeLeft <= 15 ? "text-destructive" : timeLeft <= 30 ? "text-yellow-500" : "text-foreground";

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
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <Trophy className="h-10 w-10 text-primary-foreground" />
        </motion.div>
        <h2 className="font-display text-4xl font-bold text-foreground">FOUND!</h2>
        <p className="text-lg text-muted-foreground">
          You found them in <span className="font-bold text-secondary">{MOCK_MATCH_RESULT.foundInSeconds}s</span>
        </p>
        <Button
          size="lg"
          onClick={onNext}
          className="h-12 w-full max-w-xs rounded-2xl font-display font-semibold"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          See Results
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
      <div className="flex items-center justify-center gap-3">
        <Clock className={`h-5 w-5 ${timerColor}`} />
        <motion.span
          key={timeLeft}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-display text-5xl font-bold tabular-nums ${timerColor}`}
        >
          {timeLeft}
        </motion.span>
        <span className="text-sm text-muted-foreground">seconds</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundImage: timeLeft <= 15
              ? "linear-gradient(90deg, hsl(0,84%,60%), hsl(0,84%,50%))"
              : "var(--gradient-primary)",
            width: `${(timeLeft / 60) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Clues */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Eye className="h-3 w-3" />
            Clues
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {visibleClues.map((clue) => (
                <motion.div
                  key={clue.time}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg bg-accent px-3 py-2 text-sm text-foreground"
                >
                  {clue.text}
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleClues.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Clues will appear…</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            Chat
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {visibleMessages.map((msg) => (
                <motion.div
                  key={msg.time + msg.sender}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      msg.sender === "you"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleMessages.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Messages will appear…</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DemoGameplay;
