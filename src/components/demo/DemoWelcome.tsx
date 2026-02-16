import { motion } from "framer-motion";
import { Play, Users, Zap } from "lucide-react";
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
      className="flex flex-col items-center gap-8 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="flex h-24 w-24 items-center justify-center rounded-3xl shadow-xl"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <Zap className="h-12 w-12 text-primary-foreground" />
      </motion.div>

      <div className="space-y-3">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-display text-5xl font-bold text-foreground"
        >
          Experience <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>Find60</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-muted-foreground"
        >
          The most interesting minute of your day
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 rounded-full bg-accent px-4 py-2"
      >
        <Users className="h-4 w-4 text-accent-foreground" />
        <span className="text-sm font-medium text-accent-foreground">
          {MOCK_ONLINE_PLAYERS} players online
        </span>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-xs space-y-3"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="h-14 w-full rounded-2xl font-display text-lg font-semibold shadow-lg"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          <Play className="mr-2 h-5 w-5" />
          Start Demo
        </Button>
        <p className="text-xs text-muted-foreground">
          No wallet needed · Fully simulated · 2 min walkthrough
        </p>
      </motion.div>
    </motion.div>
  );
};

export default DemoWelcome;
