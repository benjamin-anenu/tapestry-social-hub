import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MatchCountdownProps {
  chatStartsAt: string;
  partnerName: string;
  onComplete: () => void;
}

const MatchCountdown = ({ chatStartsAt, partnerName, onComplete }: MatchCountdownProps) => {
  const [display, setDisplay] = useState<string>("3");

  useEffect(() => {
    const targetTime = new Date(chatStartsAt).getTime();

    const tick = () => {
      const remaining = Math.ceil((targetTime - Date.now()) / 1000);
      if (remaining > 3) {
        setDisplay("3");
      } else if (remaining === 3) {
        setDisplay("3");
      } else if (remaining === 2) {
        setDisplay("2");
      } else if (remaining === 1) {
        setDisplay("1");
      } else {
        setDisplay("GO!");
        setTimeout(onComplete, 600);
        return;
      }
      requestAnimationFrame(() => setTimeout(tick, 100));
    };

    tick();
  }, [chatStartsAt, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="font-mono text-xs text-muted-foreground">
        Matched with <span className="text-primary font-bold">{partnerName}</span>
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={display}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`flex h-28 w-28 items-center justify-center rounded-full ${
            display === "GO!"
              ? "bg-primary text-primary-foreground"
              : "border-2 border-primary/50 text-primary"
          }`}
        >
          <span className="font-display text-5xl font-black">{display}</span>
        </motion.div>
      </AnimatePresence>

      <p className="font-mono text-[10px] text-muted-foreground/60 tracking-widest uppercase">
        Get ready to vibe
      </p>
    </div>
  );
};

export default MatchCountdown;
