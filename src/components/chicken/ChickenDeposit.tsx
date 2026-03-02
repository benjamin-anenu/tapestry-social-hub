import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { supabase } from "@/integrations/supabase/client";

interface ChickenDepositProps {
  gameId: string;
  stakeAmount: number;
  escrowPublicKey: string;
  myDeposited: boolean;
  opponentDeposited: boolean;
  onDeposited: () => void;
}

const ChickenDeposit = ({
  gameId,
  stakeAmount,
  escrowPublicKey,
  myDeposited,
  opponentDeposited,
  onDeposited,
}: ChickenDepositProps) => {
  const { publicKey, sendTransaction } = useWallet();
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!publicKey || !sendTransaction) return;
    setDepositing(true);
    setError(null);

    try {
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const lamports = Math.round(stakeAmount * 1_000_000_000);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(escrowPublicKey),
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      // Verify with backend
      const { data, error: fnErr } = await supabase.functions.invoke("chicken-deposit", {
        body: {
          gameId,
          walletAddress: publicKey.toBase58(),
          txSignature: signature,
        },
      });

      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);

      onDeposited();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      setError(message);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 p-6"
    >
      <h2 className="font-display text-2xl font-bold text-foreground">
        Deposit Your Stake
      </h2>

      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-4xl font-bold text-primary">
          {stakeAmount} SOL
        </span>
        <span className="text-sm text-muted-foreground">per player</span>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">You</span>
          {myDeposited ? (
            <span className="flex items-center gap-1 text-sm font-bold text-green-500">
              <Check className="h-4 w-4" /> Deposited
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Pending</span>
          )}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">Opponent</span>
          {opponentDeposited ? (
            <span className="flex items-center gap-1 text-sm font-bold text-green-500">
              <Check className="h-4 w-4" /> Deposited
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Waiting...</span>
          )}
        </div>
      </div>

      {!myDeposited && (
        <Button
          onClick={handleDeposit}
          disabled={depositing}
          size="lg"
          className="w-full max-w-xs text-lg font-bold"
        >
          {depositing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Depositing...
            </>
          ) : (
            `DEPOSIT ${stakeAmount} SOL`
          )}
        </Button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {myDeposited && !opponentDeposited && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Waiting for opponent to deposit...
        </p>
      )}
    </motion.div>
  );
};

export default ChickenDeposit;
