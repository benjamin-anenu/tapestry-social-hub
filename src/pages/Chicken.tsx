import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Flame } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import ChickenDeposit from "@/components/chicken/ChickenDeposit";
import ChickenGame from "@/components/chicken/ChickenGame";
import ChickenResult from "@/components/chicken/ChickenResult";

type Phase = "lobby" | "waiting" | "deposit" | "active" | "result";

interface GameState {
  gameId: string;
  role: "player_a" | "player_b";
  stakeAmount: number;
  escrowPublicKey: string;
  myProfileId: string;
}

interface ResultData {
  result: "win" | "lose" | "mutual_destruction";
  payout?: number;
  payoutTx?: string | null;
  cashedOutAt?: number;
  myValue?: number;
  oppValue?: number;
}

const DURATION_OPTIONS = [60, 90, 120, 180];

const Chicken = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const challengeTargetId = searchParams.get("challenge");
  const respondGameId = searchParams.get("gameId");

  const [phase, setPhase] = useState<Phase>("lobby");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myDeposited, setMyDeposited] = useState(false);
  const [opponentDeposited, setOpponentDeposited] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(0.05);
  const [freePlay, setFreePlay] = useState(false);
  const [gameDuration, setGameDuration] = useState(60);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [waitCountdown, setWaitCountdown] = useState(30);

  const effectiveStake = freePlay ? 0 : stakeAmount;

  // Redirect if no wallet
  useEffect(() => {
    if (!walletAddress) {
      navigate("/play");
    }
  }, [walletAddress, navigate]);

  // Auto-trigger for challenge or respond params
  useEffect(() => {
    if (autoTriggered || !walletAddress) return;

    if (challengeTargetId) {
      setAutoTriggered(true);
      handleCreateChallenge(challengeTargetId);
    } else if (respondGameId) {
      setAutoTriggered(true);
      handleJoinFromChallenge(respondGameId);
    }
  }, [walletAddress, challengeTargetId, respondGameId, autoTriggered]);

  // Subscribe to game changes
  useEffect(() => {
    if (!gameState?.gameId) return;

    const channel = supabase
      .channel(`chicken-lobby-${gameState.gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chicken_games",
          filter: `id=eq.${gameState.gameId}`,
        },
        (payload) => {
          const game = payload.new as Record<string, unknown>;

          // For free play, skip deposit phase — go straight to active
          if (game.status === "depositing" && effectiveStake === 0) {
            // The backend should set it to active directly, but handle edge case
            setPhase("active");
            return;
          }

          if (game.status === "depositing" && (phase === "waiting" || phase === "lobby")) {
            setPhase("deposit");
          }

          if (game.status === "active" && (phase === "deposit" || phase === "waiting")) {
            setPhase("active");
          }

          const isA = gameState.role === "player_a";
          setMyDeposited(isA ? (game.player_a_deposited as boolean) : (game.player_b_deposited as boolean));
          setOpponentDeposited(isA ? (game.player_b_deposited as boolean) : (game.player_a_deposited as boolean));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState?.gameId, gameState?.role, phase, effectiveStake]);

  // 30-second timeout for arena random matching (not friend challenges)
  useEffect(() => {
    if (phase !== "waiting" || challengeTargetId) return;
    setWaitCountdown(30);
    const interval = setInterval(() => {
      setWaitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase("lobby");
          setError("No players available right now. Try again!");
          setGameState(null);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, challengeTargetId]);

  const getEscrowAndProfile = async () => {
    const { data: escrowData, error: escrowErr } = await supabase.functions.invoke("chicken-escrow-info");
    if (escrowErr) throw new Error(escrowErr.message);
    if (escrowData?.error) throw new Error(escrowData.error);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress!)
      .single();

    return { escrowPublicKey: escrowData.escrowPublicKey, profileId: profile?.id || "" };
  };

  const handleCreateChallenge = async (targetId: string) => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);

    try {
      const { escrowPublicKey, profileId } = await getEscrowAndProfile();

      const { data, error: createErr } = await supabase.functions.invoke("chicken-create", {
        body: { walletAddress, stakeAmount: effectiveStake, targetProfileId: targetId, gameDuration },
      });
      if (createErr) throw new Error(createErr.message);
      if (data?.error) throw new Error(data.error);

      setGameState({
        gameId: data.gameId,
        role: "player_a",
        stakeAmount: effectiveStake,
        escrowPublicKey,
        myProfileId: profileId,
      });
      setPhase("waiting");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFromChallenge = async (gameId: string) => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);

    try {
      const { escrowPublicKey, profileId } = await getEscrowAndProfile();

      // Get game details
      const { data: game } = await supabase
        .from("chicken_games")
        .select("stake_amount")
        .eq("id", gameId)
        .single();

      const joinStake = game?.stake_amount || 0;

      setGameState({
        gameId,
        role: "player_b",
        stakeAmount: joinStake,
        escrowPublicKey,
        myProfileId: profileId,
      });
      // If free play (stake=0), go straight to active phase
      setPhase(joinStake === 0 ? "active" : "deposit");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleFindOpponent = async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);

    try {
      const { escrowPublicKey, profileId } = await getEscrowAndProfile();

      const { data, error: createErr } = await supabase.functions.invoke("chicken-create", {
        body: { walletAddress, stakeAmount: effectiveStake, gameDuration },
      });
      if (createErr) throw new Error(createErr.message);
      if (data?.error) throw new Error(data.error);

      setGameState({
        gameId: data.gameId,
        role: data.role,
        stakeAmount: effectiveStake,
        escrowPublicKey,
        myProfileId: profileId,
      });

      if (data.status === "matched") {
        // Free play skips deposit
        setPhase(effectiveStake === 0 ? "active" : "deposit");
      } else {
        setPhase("waiting");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGameEnd = useCallback(
    (result: "win" | "lose" | "mutual_destruction", data?: Record<string, unknown>) => {
      setResultData({
        result,
        payout: data?.payout as number | undefined,
        payoutTx: data?.payoutTx as string | null | undefined,
        cashedOutAt: data?.cashedOutAt as number | undefined,
        myValue: data?.myValue as number | undefined,
        oppValue: data?.oppValue as number | undefined,
      });
      setPhase("result");
    },
    []
  );

  const handlePlayAgain = () => {
    setPhase("lobby");
    setGameState(null);
    setMyDeposited(false);
    setOpponentDeposited(false);
    setResultData(null);
    setError(null);
    setAutoTriggered(false);
  };

  const isChallenge = !!challengeTargetId;

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => navigate("/play")}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="font-display text-lg font-bold">CHICKEN</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {/* LOBBY */}
          {phase === "lobby" && !loading && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="h-20 w-20 text-orange-500" />
              </motion.div>
              <h1 className="font-display text-3xl font-black">
                {gameDuration}-SECOND TRADING BATTLE
              </h1>
              <p className="max-w-sm text-muted-foreground">
                Trade <span className="font-bold text-primary">$CHKN</span> on a live
                market chart. Buy low, sell high. Highest portfolio value when the timer
                hits zero{" "}
                {freePlay ? (
                  <span className="font-bold text-primary">WINS bragging rights</span>
                ) : (
                  <span className="font-bold text-primary">WINS the SOL pot</span>
                )}
                . Loser is the{" "}
                <span className="font-bold text-destructive">CHICKEN 🐔</span>.
              </p>

              {/* Free Play Toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className={`text-sm font-medium ${freePlay ? "text-muted-foreground" : "text-foreground"}`}>
                  Stake SOL
                </span>
                <Switch
                  checked={freePlay}
                  onCheckedChange={setFreePlay}
                />
                <span className={`text-sm font-medium ${freePlay ? "text-foreground" : "text-muted-foreground"}`}>
                  Free Play
                </span>
              </div>

              {/* Stake Input (hidden in free play) */}
              {!freePlay && (
                <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
                  <label className="text-sm text-muted-foreground">Stake (SOL)</label>
                  <Input
                    type="number"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(parseFloat(e.target.value) || 0.01)}
                    className="rounded-lg border-border/50 bg-muted/50 font-mono text-2xl font-bold text-center"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Winner gets {(stakeAmount * 2 * 0.9).toFixed(4)} SOL (10% fee)
                  </p>
                </div>
              )}

              {/* Duration Selector */}
              <div className="flex flex-col gap-2 items-center">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Duration</label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <Button
                      key={d}
                      variant={gameDuration === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGameDuration(d)}
                      className="font-mono text-sm"
                    >
                      {d}s
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleFindOpponent}
                disabled={loading}
                size="lg"
                className="w-full max-w-xs text-lg font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finding...
                  </>
                ) : (
                  "FIND OPPONENT 🔥"
                )}
              </Button>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </motion.div>
          )}

          {/* LOADING (auto-trigger) */}
          {phase === "lobby" && loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <h2 className="font-display text-xl font-bold">
                {isChallenge ? "Sending challenge..." : "Joining game..."}
              </h2>
            </motion.div>
          )}

          {/* WAITING */}
          {phase === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <h2 className="font-display text-2xl font-bold">
                {isChallenge ? "Challenge sent!" : "Waiting for opponent..."}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isChallenge
                  ? "Waiting for your friend to accept..."
                  : `Searching... ${waitCountdown}s remaining`}
              </p>
            </motion.div>
          )}

          {/* DEPOSIT */}
          {phase === "deposit" && gameState && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChickenDeposit
                gameId={gameState.gameId}
                stakeAmount={gameState.stakeAmount}
                escrowPublicKey={gameState.escrowPublicKey}
                myDeposited={myDeposited}
                opponentDeposited={opponentDeposited}
                onDeposited={() => setMyDeposited(true)}
              />
            </motion.div>
          )}

          {/* ACTIVE GAME */}
          {phase === "active" && gameState && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <ChickenGame
                gameId={gameState.gameId}
                walletAddress={walletAddress!}
                myProfileId={gameState.myProfileId}
                stakeAmount={gameState.stakeAmount}
                onGameEnd={handleGameEnd}
              />
            </motion.div>
          )}

          {/* RESULT */}
          {phase === "result" && resultData && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChickenResult
                result={resultData.result}
                payout={resultData.payout}
                payoutTx={resultData.payoutTx}
                cashedOutAt={resultData.cashedOutAt}
                stakeAmount={effectiveStake}
                myValue={resultData.myValue}
                oppValue={resultData.oppValue}
                onPlayAgain={handlePlayAgain}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Chicken;
