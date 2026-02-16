import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Zap, Shield, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MOCK_AGENT, MOCK_AGENT_CHAT } from "@/lib/mock-data";

interface DemoAgentDemoProps {
  onNext: () => void;
}

const DemoAgentDemo = ({ onNext }: DemoAgentDemoProps) => {
  const [phase, setPhase] = useState<"intro" | "hunt" | "result">("intro");
  const [timeLeft, setTimeLeft] = useState(15);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (phase !== "hunt") return;
    const timer = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          clearInterval(timer);
          setPhase("result");
          return 0;
        }
        return p - 1;
      });
    }, 400);

    const msgTimer = setInterval(() => {
      setMessageIndex((p) => Math.min(p + 1, MOCK_AGENT_CHAT.length));
    }, 700);

    return () => {
      clearInterval(timer);
      clearInterval(msgTimer);
    };
  }, [phase]);

  if (phase === "intro") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-md flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10"
          style={{ boxShadow: "0 0 30px hsla(270, 80%, 60%, 0.3)" }}
        >
          <Bot className="h-10 w-10 text-purple-400" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="font-display text-3xl font-bold text-purple-400" style={{ textShadow: "0 0 20px hsla(270, 80%, 60%, 0.5)" }}>
            AGENT CHALLENGE
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            Now try hunting an AI agent...
          </p>
        </div>

        <Card className="w-full border-purple-500/20 bg-card/80">
          <CardContent className="flex items-center gap-4 p-5">
            <Avatar className="h-14 w-14 rounded-xl border-2 border-purple-500/30">
              <AvatarImage src={MOCK_AGENT.avatar} />
              <AvatarFallback className="rounded-xl bg-muted font-mono text-xs">AB</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-display text-lg font-bold text-foreground">{MOCK_AGENT.displayName}</p>
              <p className="font-mono text-xs text-muted-foreground">{MOCK_AGENT.username}</p>
              <div className="mt-1.5 flex gap-2">
                <span className="rounded border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[9px] text-purple-400">
                  WIN RATE {MOCK_AGENT.winRate}%
                </span>
                <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  {MOCK_AGENT.gamesPlayed} GAMES
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          onClick={() => setPhase("hunt")}
          className="h-12 w-full rounded-xl font-display font-bold text-white"
          style={{ background: "linear-gradient(135deg, hsl(270, 80%, 50%), hsl(220, 100%, 50%))" }}
        >
          <Zap className="mr-2 h-5 w-5" />
          BEGIN AI HUNT
        </Button>
      </motion.div>
    );
  }

  if (phase === "hunt") {
    const visibleMessages = MOCK_AGENT_CHAT.slice(0, messageIndex);
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex w-full max-w-md flex-col items-center gap-4"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-400" />
          <span className="font-mono text-[10px] tracking-widest text-purple-400">AI HUNT — COMPRESSED</span>
        </div>

        <motion.span
          key={timeLeft}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="font-mono text-5xl font-bold text-purple-400"
          style={{ textShadow: "0 0 20px hsla(270, 80%, 60%, 0.5)" }}
        >
          {timeLeft}
        </motion.span>

        <Card className="w-full border-purple-500/20 bg-card/80">
          <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
            <AnimatePresence>
              {visibleMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "you" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-1.5 font-mono text-xs ${
                      msg.sender === "agent"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/20"
                        : "bg-primary/20 text-primary border border-primary/20"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex w-full max-w-md flex-col items-center gap-6 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring" }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10"
        style={{ boxShadow: "0 0 30px hsla(270, 80%, 60%, 0.3)" }}
      >
        <Award className="h-10 w-10 text-purple-400" />
      </motion.div>

      <h2 className="font-display text-3xl font-bold text-purple-400" style={{ textShadow: "0 0 20px hsla(270, 80%, 60%, 0.5)" }}>
        AI HUNT COMPLETE
      </h2>

      <div className="space-y-3 w-full">
        <Card className="border-purple-500/20 bg-card/80">
          <CardContent className="p-4 text-center">
            <p className="font-mono text-xs text-muted-foreground mb-2">BADGE EARNED</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2"
            >
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="font-display text-sm font-bold text-purple-400">
                {MOCK_AGENT.badge}
              </span>
            </motion.div>
          </CardContent>
        </Card>

        <p className="font-mono text-[10px] text-muted-foreground">
          AlphaBot solved your puzzle in 12 seconds. Can you do better?
        </p>
      </div>

      <Button
        size="lg"
        onClick={onNext}
        className="h-12 w-full max-w-xs rounded-xl bg-primary font-display font-bold text-primary-foreground glow-blue"
      >
        FINISH DEMO
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );
};

export default DemoAgentDemo;
