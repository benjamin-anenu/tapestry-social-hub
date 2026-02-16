import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, CheckCircle, Shield, Globe, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { MOCK_WALLET, MOCK_USER, MOCK_REPUTATION, MOCK_CROSS_APP } from "@/lib/mock-data";

interface DemoWalletConnectProps {
  onNext: () => void;
}

type Phase = "idle" | "connecting" | "connected" | "revealing" | "revealed";

const DemoWalletConnect = ({ onNext }: DemoWalletConnectProps) => {
  const [phase, setPhase] = useState<Phase>("idle");

  const handleConnect = () => {
    setPhase("connecting");
    setTimeout(() => setPhase("connected"), 1500);
    setTimeout(() => setPhase("revealing"), 2500);
    setTimeout(() => setPhase("revealed"), 3500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex w-full max-w-md flex-col items-center gap-6"
    >
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-6"
          >
            <div className="space-y-2 text-center">
              <h2 className="font-display text-3xl font-bold text-foreground">Connect Wallet</h2>
              <p className="text-muted-foreground">Simulate a Phantom wallet connection</p>
            </div>
            <Button
              size="lg"
              onClick={handleConnect}
              className="h-14 w-full rounded-2xl font-display text-lg font-semibold"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Phantom
            </Button>
          </motion.div>
        )}

        {phase === "connecting" && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-12 w-12 rounded-full border-4 border-muted border-t-primary"
            />
            <p className="font-display text-lg font-medium text-foreground">Connecting wallet…</p>
          </motion.div>
        )}

        {(phase === "connected" || phase === "revealing") && (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2">
              <CheckCircle className="h-4 w-4 text-secondary" />
              <span className="font-mono text-sm text-foreground">{MOCK_WALLET.truncated}</span>
            </div>
            {phase === "revealing" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-muted-foreground"
              >
                Searching Tapestry social graph…
              </motion.p>
            )}
          </motion.div>
        )}

        {phase === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2">
              <CheckCircle className="h-4 w-4 text-secondary" />
              <span className="font-mono text-sm text-foreground">{MOCK_WALLET.truncated}</span>
            </div>

            <Card className="w-full overflow-hidden border-primary/20">
              <div className="h-1.5 w-full" style={{ backgroundImage: "var(--gradient-primary)" }} />
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-semibold text-secondary">Tapestry found your identity!</span>
                </div>

                <div className="mb-5 flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/30">
                    <AvatarImage src={MOCK_USER.avatar} />
                    <AvatarFallback>CS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">{MOCK_USER.displayName}</p>
                    <p className="text-sm text-muted-foreground">{MOCK_USER.username}</p>
                  </div>
                  <div className="ml-auto text-center">
                    <p className="font-display text-2xl font-bold text-foreground">{MOCK_USER.vibeScore}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vibe Score</p>
                  </div>
                </div>

                <div className="mb-4 flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Globe className="mr-1 h-3 w-3" />
                    {MOCK_CROSS_APP.appsConnected} apps connected
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Star className="mr-1 h-3 w-3" />
                    Global: {MOCK_CROSS_APP.globalScore}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cross-App Reputation</p>
                  {MOCK_REPUTATION.map((rep, i) => (
                    <motion.div
                      key={rep.app}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.15 }}
                      className="space-y-1"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground font-medium">{rep.app}</span>
                        <span className="text-muted-foreground">{rep.score}/100</span>
                      </div>
                      <ReputationBar score={rep.score} color={rep.color} delay={0.3 + i * 0.15} />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              onClick={onNext}
              className="h-12 w-full rounded-2xl font-display font-semibold"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReputationBar = ({ score, color, delay }: { score: number; color: string; delay: number }) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setValue(score), delay * 1000);
    return () => clearTimeout(t);
  }, [score, delay]);

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default DemoWalletConnect;
