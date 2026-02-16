import { motion } from "framer-motion";
import { Play, Users, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_ONLINE_PLAYERS } from "@/lib/mock-data";

interface DemoWelcomeProps {
  onNext: () => void;
}

const DemoWelcome = ({ onNext }: DemoWelcomeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-10 text-center"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
        className="relative"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 glow-blue">
          <Crosshair className="h-12 w-12 text-primary" />
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 animate-ping rounded-2xl border border-primary/20" style={{ animationDuration: "2s" }} />
      </motion.div>

      <div className="space-y-4">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-display text-6xl font-bold tracking-tight text-foreground"
        >
          <span className="glitch text-glow-blue" data-text="FIND">FIND</span>
          <span className="text-primary text-glow-blue">60</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-mono text-sm tracking-wider text-muted-foreground"
        >
          THE MOST INTERESTING MINUTE OF YOUR DAY
        </motion.p>
      </div>

      {/* Online indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2.5 rounded-full border border-border bg-card/50 px-4 py-2 backdrop-blur-sm"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
        </span>
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-xs text-foreground">
          <span className="text-secondary font-semibold">{MOCK_ONLINE_PLAYERS}</span>
          {" "}ONLINE
        </span>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-xs space-y-4"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="group relative h-14 w-full overflow-hidden rounded-xl border-0 bg-primary font-display text-lg font-bold text-primary-foreground shadow-lg transition-all hover:shadow-primary/30 hover:shadow-xl glow-blue"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Play className="h-5 w-5" />
            ENTER DEMO
          </span>
          {/* Shimmer */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </Button>
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground">
          NO WALLET · SIMULATED · 2 MIN WALKTHROUGH
        </p>
      </motion.div>
    </motion.div>
  );
};

export default DemoWelcome;
