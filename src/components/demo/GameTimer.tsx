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
    <div className="flex items-center gap-2 w-full">
      <Clock
        className={`h-3.5 w-3.5 shrink-0 ${
          isUrgent ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary"
        }`}
      />
      <motion.span
        key={timeLeft}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`font-mono text-lg font-bold tabular-nums shrink-0 ${
          isUrgent
            ? "text-destructive animate-pulse"
            : isWarning
            ? "text-yellow-500"
            : "text-foreground"
        }`}
      >
        {String(timeLeft).padStart(2, "0")}s
      </motion.span>
      {/* Progress bar */}
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
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
