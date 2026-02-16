import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import { MOCK_BOUNTY } from "@/lib/mock-data";

interface BountyTrackerProps {
  timeLeft: number;
  cluesRevealed: number;
  totalClues: number;
}

const BountyTracker = ({ timeLeft, cluesRevealed, totalClues }: BountyTrackerProps) => {
  const elapsed = 60 - timeLeft;
  const multiplierEntry = MOCK_BOUNTY.timeMultipliers
    .slice()
    .reverse()
    .find((m) => elapsed <= m.maxTime) ?? MOCK_BOUNTY.timeMultipliers[0];

  const baseBounty = MOCK_BOUNTY.base + cluesRevealed * MOCK_BOUNTY.perOptionalField;
  const currentBounty = (baseBounty * multiplierEntry.multiplier).toFixed(3);

  return (
    <div className="flex items-center justify-between rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <Coins className="h-3.5 w-3.5 text-secondary" />
        <span className="font-mono text-[9px] tracking-widest text-secondary">BOUNTY</span>
      </div>
      <div className="flex items-center gap-2">
        <motion.span
          key={currentBounty}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="font-mono text-sm font-bold text-secondary text-glow-green"
        >
          {currentBounty} SOL
        </motion.span>
        <span className="rounded border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-secondary">
          {multiplierEntry.label}
        </span>
      </div>
    </div>
  );
};

export default BountyTracker;
