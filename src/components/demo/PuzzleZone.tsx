import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Eye, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MOCK_PUZZLE_FIELDS, type PuzzleField } from "@/lib/mock-data";

interface PuzzleZoneProps {
  timeLeft: number;
  onSolve: () => void;
  autoSolveAt?: number; // time remaining when auto-solve triggers
}

const PuzzleZone = ({ timeLeft, onSolve, autoSolveAt = 17 }: PuzzleZoneProps) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [wrongGuess, setWrongGuess] = useState(false);
  const [penalty, setPenalty] = useState(0);
  const [solved, setSolved] = useState(false);

  const unlockedFields = MOCK_PUZZLE_FIELDS.filter((f) => timeLeft <= f.unlockTime);
  const cluesRevealed = unlockedFields.length;

  // Auto-fill and solve at specified time
  useEffect(() => {
    if (timeLeft <= autoSolveAt && !solved) {
      // Auto-fill correct answers
      const correct: Record<string, string> = {};
      MOCK_PUZZLE_FIELDS.forEach((f) => {
        correct[f.id] = f.answer;
      });
      setValues(correct);
      setTimeout(() => {
        setSolved(true);
        onSolve();
      }, 800);
    }
  }, [timeLeft, autoSolveAt, solved, onSolve]);

  const handleChange = (id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    const allCorrect = MOCK_PUZZLE_FIELDS.filter((f) => f.isRequired).every(
      (f) => values[f.id]?.toLowerCase().trim() === f.answer.toLowerCase()
    );
    if (allCorrect) {
      setSolved(true);
      onSolve();
    } else {
      setWrongGuess(true);
      setPenalty((p) => p + 10);
      setTimeout(() => setWrongGuess(false), 600);
    }
  };

  const requiredFilled = MOCK_PUZZLE_FIELDS.filter((f) => f.isRequired).every(
    (f) => (values[f.id] ?? "").trim().length > 0
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[9px] tracking-widest text-primary">SOLVE THE PUZZLE</span>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">
          💡 {cluesRevealed}/{MOCK_PUZZLE_FIELDS.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {MOCK_PUZZLE_FIELDS.map((field) => {
          const isUnlocked = timeLeft <= field.unlockTime;
          return (
            <motion.div
              key={field.id}
              layout
              className={`rounded-lg border p-3 transition-all ${
                isUnlocked
                  ? "border-primary/30 bg-primary/5"
                  : "border-border/30 bg-muted/20 opacity-50"
              } ${wrongGuess && isUnlocked ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[10px] tracking-wider text-muted-foreground">
                  {field.label.toUpperCase()}
                  {field.isRequired && <span className="text-destructive ml-1">*</span>}
                </label>
                {isUnlocked ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1"
                  >
                    <Unlock className="h-3 w-3 text-secondary" />
                  </motion.div>
                ) : (
                  <Lock className="h-3 w-3 text-muted-foreground/50" />
                )}
              </div>

              {isUnlocked ? (
                <>
                  <Input
                    value={values[field.id] ?? ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-8 border-primary/20 bg-background/50 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50"
                    disabled={solved}
                  />
                  <AnimatePresence>
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-1 font-mono text-[9px] text-primary/70"
                    >
                      Clue: "{field.clueText}"
                    </motion.p>
                  </AnimatePresence>
                </>
              ) : (
                <div className="flex h-8 items-center rounded-md border border-border/20 bg-muted/30 px-3">
                  <span className="font-mono text-[10px] text-muted-foreground/40">
                    🔒 LOCKED — awaiting intel
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Penalty indicator */}
      <AnimatePresence>
        {wrongGuess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <span className="font-mono text-xs font-bold text-destructive">-10 POINTS</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <div className="border-t border-border/50 p-4">
        <Button
          onClick={handleSubmit}
          disabled={!requiredFilled || solved}
          className="h-10 w-full rounded-lg bg-primary font-mono text-xs font-bold text-primary-foreground glow-blue disabled:opacity-30"
        >
          {solved ? "✓ SUBMITTED" : "SUBMIT ANSWER"}
        </Button>
      </div>
    </div>
  );
};

export default PuzzleZone;
