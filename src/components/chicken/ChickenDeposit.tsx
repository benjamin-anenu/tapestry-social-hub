import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, AlertCircle, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface ChickenDepositProps {
  gameId: string;
  stakeAmount: number;
  escrowPublicKey: string;
  myDeposited: boolean;
  opponentDeposited: boolean;
  onDeposited: () => void;
}

const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const isInWalletBrowser = () =>
  !!(window as any).phantom?.solana?.isPhantom ||
  !!(window as any).solflare?.isSolflare ||
  !!(window as any).backpack?.isBackpack;

function humanizeError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("cancelled"))
    return "You cancelled the transaction. Tap DEPOSIT again when ready.";
  if (lower.includes("insufficient funds") || lower.includes("insufficient lamports"))
    return "Not enough SOL in your wallet to cover the stake + network fee.";
  if (lower.includes("blockhash not found") || lower.includes("block height exceeded"))
    return "Transaction expired. Please try again.";
  return raw;
}

const ChickenDeposit = ({
  gameId,
  stakeAmount,
  escrowPublicKey,
  myDeposited,
  opponentDeposited,
  onDeposited,
}: ChickenDepositProps) => {
  const { publicKey, sendTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const [depositing, setDepositing] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const verifyWithBackend = useCallback(async (signature: string) => {
    setVerifyStatus("Verifying deposit with server...");
    const { data, error: fnErr } = await supabase.functions.invoke("chicken-deposit", {
      body: {
        gameId,
        walletAddress: publicKey!.toBase58(),
        txSignature: signature,
      },
    });
    if (fnErr) throw new Error(fnErr.message);
    if (data?.error) throw new Error(data.error);
    setVerifyStatus(null);
    onDeposited();
  }, [gameId, publicKey, onDeposited]);

  const startQrFallback = useCallback(() => {
    const solanaPayUrl = `solana:${escrowPublicKey}?amount=${stakeAmount}&label=Find60%20Deposit&message=Game%20${gameId.slice(0, 8)}`;
    setQrUrl(solanaPayUrl);
    setQrMode(true);
    setVerifyStatus("Scan the QR code with your wallet app...");

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        if (pollRef.current) clearInterval(pollRef.current);
        setError("Deposit timeout — please try again.");
        setQrMode(false);
        setDepositing(false);
        setVerifyStatus(null);
        return;
      }

      try {
        // Check if the game record shows we deposited (another path may have confirmed it)
        const { data: game } = await supabase
          .from("chicken_games")
          .select("player_a_deposited, player_b_deposited, player_a_id")
          .eq("id", gameId)
          .single();

        if (!game) return;

        // Determine which player we are
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("wallet_address", publicKey!.toBase58())
          .single();

        if (!profile) return;

        const isPlayerA = game.player_a_id === profile.id;
        const deposited = isPlayerA ? game.player_a_deposited : game.player_b_deposited;

        if (deposited) {
          if (pollRef.current) clearInterval(pollRef.current);
          setQrMode(false);
          setVerifyStatus(null);
          setDepositing(false);
          onDeposited();
        }
      } catch {
        // continue polling
      }
    }, 2000);
  }, [escrowPublicKey, stakeAmount, gameId, publicKey, onDeposited]);

  const cancelQr = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setQrMode(false);
    setDepositing(false);
    setVerifyStatus(null);
    setError(null);
  };

  const handleDeposit = async () => {
    if (!publicKey || !sendTransaction) return;
    setDepositing(true);
    setError(null);
    setVerifyStatus(null);

    try {
      const lamports = Math.round(stakeAmount * LAMPORTS_PER_SOL);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(escrowPublicKey),
          lamports,
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Primary: sendTransaction (handles MWA internally)
      try {
        setVerifyStatus("Sending transaction...");
        const signature = await sendTransaction(transaction, connection);

        setVerifyStatus("Confirming on-chain...");
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

        await verifyWithBackend(signature);
        return;
      } catch (sendErr: unknown) {
        const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);

        // User explicitly rejected — don't fallback
        if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("cancelled")) {
          throw sendErr;
        }

        // On mobile PWA (not in-wallet browser), fall back to QR
        if (isMobile() && !isInWalletBrowser()) {
          console.warn("sendTransaction failed on mobile, falling back to QR:", msg);
          startQrFallback();
          return;
        }

        // Desktop failure — just throw
        throw sendErr;
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Deposit failed";
      setError(humanizeError(raw));
      setVerifyStatus(null);
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

      <AnimatePresence mode="wait">
        {qrMode && qrUrl ? (
          <motion.div
            key="qr"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center gap-4 w-full max-w-xs"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>Scan with your Solana wallet</span>
            </div>
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={qrUrl} size={200} level="M" />
            </div>
            <p className="text-xs text-muted-foreground text-center font-mono">
              Open Phantom or Solflare → Scan → Approve
            </p>
            <Button variant="ghost" size="sm" onClick={cancelQr} className="gap-2 text-muted-foreground">
              <X className="h-4 w-4" /> Cancel
            </Button>
          </motion.div>
        ) : !myDeposited ? (
          <motion.div key="btn" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
          </motion.div>
        ) : null}
      </AnimatePresence>

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
