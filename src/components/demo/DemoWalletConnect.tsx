import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, CheckCircle2, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    setTimeout(() => setPhase("revealing"), 2800);
    setTimeout(() => setPhase("revealed"), 4200);
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
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex w-full flex-col items-center gap-6"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2 text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">CONNECT WALLET</h2>
              <p className="font-mono text-xs text-muted-foreground">
                LINK YOUR IDENTITY TO THE TAPESTRY GRAPH
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleConnect}
              className="h-12 w-full max-w-xs rounded-xl bg-primary font-display font-bold text-primary-foreground glow-blue"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Simulate Connect
            </Button>
          </motion.div>
        )}

        {phase === "connecting" && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="h-16 w-16 rounded-2xl border-2 border-primary border-t-transparent"
            />
            <div className="space-y-1 text-center">
              <p className="font-display text-lg font-bold text-foreground">LINKING...</p>
              <p className="font-mono text-[10px] tracking-wider text-primary animate-pulse">
                SCANNING SOLANA BLOCKCHAIN
              </p>
            </div>
          </motion.div>
        )}

        {phase === "connected" && (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring" }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className="h-12 w-12 text-secondary" />
            </motion.div>
            <p className="font-display text-lg font-bold text-secondary">WALLET LINKED</p>
            <div className="rounded-lg border border-border bg-card/50 px-4 py-2 font-mono text-xs text-muted-foreground backdrop-blur-sm">
              {MOCK_WALLET.truncated}
            </div>
            <p className="font-mono text-[10px] tracking-wider text-primary animate-pulse">
              QUERYING TAPESTRY SOCIAL GRAPH...
            </p>
          </motion.div>
        )}

        {(phase === "revealing" || phase === "revealed") && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              className="w-full rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-2.5 text-center"
            >
              <p className="font-mono text-[10px] tracking-widest text-secondary">
                ⚡ TAPESTRY IDENTITY DETECTED
              </p>
            </motion.div>

            <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="relative"
                  >
                    <img
                      src={MOCK_USER.avatar}
                      alt="avatar"
                      className="h-16 w-16 rounded-xl border-2 border-primary/30"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary">
                      <CheckCircle2 className="h-3 w-3 text-secondary-foreground" />
                    </div>
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {MOCK_USER.displayName}
                    </h3>
                    <p className="font-mono text-xs text-muted-foreground">{MOCK_USER.username}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        <Globe className="h-2.5 w-2.5" />
                        {MOCK_CROSS_APP.appsConnected} APPS
                      </span>
                      <span className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                        <Zap className="h-2.5 w-2.5" />
                        VIBE {MOCK_USER.vibeScore}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="w-full border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                    CROSS-APP REPUTATION
                  </p>
                </div>
                {MOCK_REPUTATION.map((rep, i) => (
                  <ReputationBar key={rep.app} rep={rep} delay={0.3 + i * 0.15} />
                ))}
                <div className="mt-2 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2">
                  <p className="font-mono text-[10px] text-secondary">
                    💡 You already have reputation from {MOCK_REPUTATION[0].app}!
                  </p>
                </div>
              </CardContent>
            </Card>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full"
            >
              <Button
                size="lg"
                onClick={onNext}
                className="h-12 w-full rounded-xl bg-primary font-display font-bold text-primary-foreground glow-blue"
              >
                CONTINUE →
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReputationBar = ({
  rep,
  delay,
}: {
  rep: { app: string; score: number; color: string };
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="flex items-center gap-3"
  >
    <span className="w-20 font-mono text-xs text-foreground">{rep.app}</span>
    <div className="flex-1 overflow-hidden rounded-full bg-muted">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${rep.score}%` }}
        transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
        className="h-1.5 rounded-full"
        style={{ background: rep.color }}
      />
    </div>
    <span className="w-8 text-right font-mono text-xs font-bold text-foreground">{rep.score}</span>
  </motion.div>
);

export default DemoWalletConnect;
