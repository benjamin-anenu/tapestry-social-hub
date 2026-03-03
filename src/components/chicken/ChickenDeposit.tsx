import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { supabase } from "@/integrations/supabase/client";

interface ChickenDepositProps {
  gameId: string;
  stakeAmount: number;
  escrowPublicKey: string;
  myDeposited: boolean;
  opponentDeposited: boolean;
  onDeposited: () => void;
}

const SIGNATURE_MISSING_PATTERNS = [
  "missing signature",
  "signature verification failed",
  "transaction signature",
  "user rejected",
];

function isSignatureMissingError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return SIGNATURE_MISSING_PATTERNS.some((p) => lower.includes(p));
}

function humanizeError(raw: string, walletName?: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes("missing signature") || lower.includes("signature verification failed")) {
    return "Wallet did not sign the transaction. Please open your wallet app and approve again. If this persists on mobile, open the game inside Phantom/Solflare in-app browser.";
  }
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("cancelled")) {
    return "You cancelled the transaction. Tap DEPOSIT again when ready.";
  }
  if (lower.includes("insufficient funds") || lower.includes("insufficient lamports")) {
    return "Not enough SOL in your wallet to cover the stake + network fee.";
  }
  if (lower.includes("blockhash not found") || lower.includes("block height exceeded")) {
    return "Transaction expired. Please try again.";
  }

  const walletHint = walletName ? ` (connected via ${walletName})` : "";
  return `${raw}${walletHint}`;
}

const ChickenDeposit = ({
  gameId,
  stakeAmount,
  escrowPublicKey,
  myDeposited,
  opponentDeposited,
  onDeposited,
}: ChickenDepositProps) => {
  const { publicKey, signTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const [depositing, setDepositing] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialPubkeyRef = useRef<string | null>(null);

  const buildTransaction = useCallback(async () => {
    if (!publicKey) throw new Error("Wallet not connected");

    const lamports = Math.round(stakeAmount * 1_000_000_000);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(escrowPublicKey),
        lamports,
      })
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    return { transaction, lastValidBlockHeight, blockhash };
  }, [publicKey, stakeAmount, escrowPublicKey, connection]);

  const attemptSend = useCallback(async (): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    // Account consistency check
    const currentKey = publicKey.toBase58();
    if (initialPubkeyRef.current && initialPubkeyRef.current !== currentKey) {
      throw new Error(
        "Connected wallet account changed. Reconnect using the same account used for this game."
      );
    }
    initialPubkeyRef.current = currentKey;

    const { transaction, lastValidBlockHeight, blockhash } = await buildTransaction();

    // Two-step: signTransaction triggers the wallet deep link on mobile
    const signedTx = await signTransaction(transaction);

    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return signature;
  }, [publicKey, signTransaction, connection, buildTransaction]);

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction) return;
    setDepositing(true);
    setError(null);
    setVerifyStatus(null);
    initialPubkeyRef.current = publicKey.toBase58();

    const walletName = wallet?.adapter?.name;

    try {
      let signature: string;

      // Stage A: normal send
      try {
        setVerifyStatus("Sending transaction...");
        signature = await attemptSend();
      } catch (firstErr: unknown) {
        const firstMsg =
          firstErr instanceof Error ? firstErr.message : String(firstErr);

        // If user explicitly rejected, don't retry
        if (firstMsg.toLowerCase().includes("user rejected") || firstMsg.toLowerCase().includes("cancelled")) {
          throw firstErr;
        }

        // Stage B: one-time retry for signature-missing patterns
        if (isSignatureMissingError(firstMsg)) {
          setVerifyStatus("Retrying transaction (wallet session refresh)...");
          try {
            signature = await attemptSend();
          } catch (retryErr: unknown) {
            const retryMsg =
              retryErr instanceof Error ? retryErr.message : String(retryErr);
            throw new Error(humanizeError(retryMsg, walletName));
          }
        } else {
          throw firstErr;
        }
      }

      // Verify with backend
      setVerifyStatus("Verifying deposit with server...");
      const { data, error: fnErr } = await supabase.functions.invoke(
        "chicken-deposit",
        {
          body: {
            gameId,
            walletAddress: publicKey.toBase58(),
            txSignature: signature,
          },
        }
      );

      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);

      setVerifyStatus(null);
      onDeposited();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Deposit failed";
      setError(humanizeError(raw, walletName));
      setVerifyStatus(null);
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

      {verifyStatus && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          {verifyStatus}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive max-w-xs text-center">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
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
