import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface VibeFeedbackProps {
  onSubmit: (verdict: "vibe" | "nah", feedback: string) => void;
  partnerName: string;
  disabled?: boolean;
}

const VibeFeedback = ({ onSubmit, partnerName, disabled }: VibeFeedbackProps) => {
  const [feedback, setFeedback] = useState("");
  const [selectedVerdict, setSelectedVerdict] = useState<"vibe" | "nah" | null>(null);

  const handleSubmit = (verdict: "vibe" | "nah") => {
    setSelectedVerdict(verdict);
    onSubmit(verdict, feedback.trim());
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <h2 className="font-display text-2xl font-bold text-foreground text-center">
        Time's up! <span className="text-primary text-glow-blue">Vibe check?</span>
      </h2>

      <p className="font-mono text-xs text-muted-foreground text-center">
        Leave a message for <span className="text-foreground font-bold">{partnerName}</span>
      </p>

      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value.slice(0, 140))}
        placeholder="Say something nice (or keep it real)..."
        className="min-h-[80px] resize-none border-border/50 bg-card/80 font-mono text-sm placeholder:text-muted-foreground/50"
        maxLength={140}
        disabled={disabled}
      />
      <p className="font-mono text-[10px] text-muted-foreground self-end -mt-4">
        {feedback.length}/140
      </p>

      <div className="flex gap-4 w-full">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
          <Button
            onClick={() => handleSubmit("vibe")}
            disabled={disabled || selectedVerdict !== null}
            className="h-14 w-full rounded-2xl font-display text-lg font-bold glow-green"
            style={{ backgroundImage: "var(--gradient-success)" }}
          >
            <Heart className="mr-2 h-5 w-5" />
            Vibe ✨
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
          <Button
            onClick={() => handleSubmit("nah")}
            disabled={disabled || selectedVerdict !== null}
            variant="outline"
            className="h-14 w-full rounded-2xl border-border/50 font-display text-lg font-bold text-muted-foreground hover:border-destructive/30"
          >
            <X className="mr-2 h-5 w-5" />
            Nah
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default VibeFeedback;
