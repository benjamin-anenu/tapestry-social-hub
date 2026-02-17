import { motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VibeVerdictProps {
  onVerdict: (verdict: "vibe" | "nah") => void;
  partnerName: string;
}

const VibeVerdict = ({ onVerdict, partnerName }: VibeVerdictProps) => {
  return (
    <div className="flex flex-col items-center gap-8">
      <h2 className="font-display text-3xl font-bold text-foreground text-center">
        Time's up! <span className="text-primary text-glow-blue">Vibe check?</span>
      </h2>
      <p className="font-mono text-xs text-muted-foreground text-center">
        Did you vibe with <span className="text-foreground font-bold">{partnerName}</span>?
      </p>

      <div className="flex gap-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => onVerdict("vibe")}
            className="h-16 w-36 rounded-2xl font-display text-lg font-bold glow-green"
            style={{ backgroundImage: "var(--gradient-success)" }}
          >
            <Heart className="mr-2 h-5 w-5" />
            Vibe ✨
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => onVerdict("nah")}
            variant="outline"
            className="h-16 w-36 rounded-2xl border-border/50 font-display text-lg font-bold text-muted-foreground hover:border-destructive/30"
          >
            <X className="mr-2 h-5 w-5" />
            Nah
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default VibeVerdict;
