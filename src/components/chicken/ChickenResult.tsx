import { motion } from "framer-motion";
import { Trophy, Skull, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChickenResultProps {
  result: "win" | "lose" | "mutual_destruction";
  payout?: number;
  payoutTx?: string | null;
  cashedOutAt?: number;
  stakeAmount: number;
  onPlayAgain: () => void;
}

const ChickenResult = ({
  result,
  payout,
  payoutTx,
  cashedOutAt,
  stakeAmount,
  onPlayAgain,
}: ChickenResultProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.6 }}
      className="flex flex-col items-center gap-6 p-6 text-center"
    >
      {result === "win" && (
        <>
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: 2 }}
          >
            <Trophy className="h-24 w-24 text-yellow-400" />
          </motion.div>
          <h1 className="font-display text-4xl font-black text-foreground">
            YOU WIN! 🎉
          </h1>
          <p className="text-lg text-muted-foreground">
            You cashed out at <span className="font-bold text-primary">{cashedOutAt}</span>
          </p>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-6 py-4">
            <p className="text-sm text-muted-foreground">Payout</p>
            <p className="font-mono text-3xl font-bold text-primary">
              {payout?.toFixed(4)} SOL
            </p>
          </div>
          {payoutTx && (
            <a
              href={`https://explorer.solana.com/tx/${payoutTx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              View transaction on Solana Explorer
            </a>
          )}
        </>
      )}

      {result === "lose" && (
        <>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Skull className="h-24 w-24 text-destructive" />
          </motion.div>
          <h1 className="font-display text-4xl font-black text-destructive">
            🐔 CHICKEN! 🐔
          </h1>
          <p className="text-lg text-muted-foreground">
            Your opponent cashed out first
          </p>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-4">
            <p className="text-sm text-muted-foreground">You lost</p>
            <p className="font-mono text-3xl font-bold text-destructive">
              -{stakeAmount} SOL
            </p>
          </div>
        </>
      )}

      {result === "mutual_destruction" && (
        <>
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Flame className="h-24 w-24 text-orange-500" />
          </motion.div>
          <h1 className="font-display text-4xl font-black text-orange-500">
            💀 MUTUAL DESTRUCTION 💀
          </h1>
          <p className="text-lg text-muted-foreground">
            Neither of you cashed out. Counter hit 100.
          </p>
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-6 py-4">
            <p className="text-sm text-muted-foreground">Both lost</p>
            <p className="font-mono text-3xl font-bold text-orange-500">
              -{stakeAmount} SOL each
            </p>
          </div>
        </>
      )}

      <Button onClick={onPlayAgain} size="lg" className="mt-4 w-full max-w-xs text-lg font-bold">
        PLAY AGAIN
      </Button>
    </motion.div>
  );
};

export default ChickenResult;
