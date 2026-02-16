import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface GameTimerProps {
  duration?: number;
  speed?: number; // ms per tick
  warningAt?: number;
  urgentAt?: number;
  onTick?: (timeLeft: number) => void;
  onComplete?: () => void;
  stopAt?: number; // stop countdown at this value
}

const GameTimer = ({
  duration = 60,
  speed = 600,
  warningAt = 30,
  urgentAt = 15,
  onTick,
  onComplete,
  stopAt,
}: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const isUrgent = timeLeft <= urgentAt;
  const isWarning = timeLeft <= warningAt && !isUrgent;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (stopAt !== undefined && next <= stopAt) {
          clearInterval(timerRef.current);
          onComplete?.();
          return next;
        }
        if (next <= 0) {
          clearInterval(timerRef.current);
          onComplete?.();
          return 0;
        }
        return next;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [speed, stopAt, onComplete]);

  useEffect(() => {
    onTick?.(timeLeft);
  }, [timeLeft, onTick]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <Clock
          className={`h-4 w-4 ${
            isUrgent ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary"
          }`}
        />
        <motion.span
          key={timeLeft}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-mono text-4xl font-bold tabular-nums ${
            isUrgent
              ? "text-destructive animate-pulse"
              : isWarning
              ? "text-yellow-500"
              : "text-foreground text-glow-blue"
          }`}
          style={isUrgent ? { textShadow: "0 0 20px hsla(340, 100%, 50%, 0.5)" } : {}}
        >
          {String(timeLeft).padStart(2, "0")}
        </motion.span>
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground">SEC</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isUrgent ? "var(--gradient-danger)" : "var(--gradient-primary)",
            width: `${(timeLeft / duration) * 100}%`,
            boxShadow: isUrgent
              ? "0 0 10px hsla(340, 100%, 50%, 0.5)"
              : "0 0 10px hsla(220, 100%, 50%, 0.3)",
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};

export default GameTimer;
