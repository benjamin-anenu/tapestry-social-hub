import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ChickenGameProps {
  gameId: string;
  walletAddress: string;
  myProfileId: string;
  stakeAmount: number;
  onGameEnd: (result: "win" | "lose" | "mutual_destruction", data?: Record<string, unknown>) => void;
}

const ChickenGame = ({
  gameId,
  walletAddress,
  myProfileId,
  stakeAmount,
  onGameEnd,
}: ChickenGameProps) => {
  const [counter, setCounter] = useState(0);
  const [youIn, setYouIn] = useState(true);
  const [theyIn, setTheyIn] = useState(true);
  const [cashingOut, setCashingOut] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameEndedRef = useRef(false);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`chicken-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chicken_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const game = payload.new as Record<string, unknown>;
          setCounter(game.counter as number);

          if (game.status === "finished" && !gameEndedRef.current) {
            gameEndedRef.current = true;

            if (game.winner_id === null) {
              onGameEnd("mutual_destruction");
            } else if (game.winner_id === myProfileId) {
              // We won - but our cashout handler already handles this
            } else {
              // Opponent won
              setTheyIn(false);
              onGameEnd("lose");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, myProfileId, onGameEnd]);

  // Drive the tick from client
  useEffect(() => {
    tickRef.current = setInterval(async () => {
      if (gameEndedRef.current) return;
      try {
        await supabase.functions.invoke("chicken-tick", {
          body: { gameId },
        });
      } catch {
        // Non-critical
      }
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [gameId]);

  const handleCashOut = async () => {
    if (cashingOut || !youIn || gameEndedRef.current) return;
    setCashingOut(true);
    setYouIn(false);

    try {
      const { data, error } = await supabase.functions.invoke("chicken-cashout", {
        body: { gameId, walletAddress },
      });

      if (error) throw error;

      if (data?.success && data?.winner) {
        gameEndedRef.current = true;
        onGameEnd("win", {
          payout: data.payout,
          payoutTx: data.payoutTx,
          cashedOutAt: data.cashedOutAt,
        });
      } else if (data?.error) {
        // Someone else cashed out first
        gameEndedRef.current = true;
        onGameEnd("lose");
      }
    } catch {
      setYouIn(true);
      setCashingOut(false);
    }
  };

  const getZoneColor = () => {
    if (counter < 30) return "text-green-500";
    if (counter < 60) return "text-yellow-500";
    if (counter < 90) return "text-orange-500";
    return "text-red-500";
  };

  const getZoneLabel = () => {
    if (counter < 30) return "SAFE ZONE";
    if (counter < 60) return "GETTING RISKY";
    if (counter < 90) return "DANGER ZONE";
    return "DEATH ZONE";
  };

  const potTotal = stakeAmount * 2;
  const potAfterFee = potTotal - potTotal * 0.1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full min-h-[80vh] flex-col items-center justify-center gap-6 p-4"
    >
      {/* Counter */}
      <motion.div
        key={counter}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        className={`font-display text-[120px] font-black leading-none sm:text-[180px] ${getZoneColor()} ${
          counter >= 90 ? "animate-pulse" : ""
        }`}
      >
        {counter}
      </motion.div>

      {/* Zone label */}
      <div className={`text-xl font-bold ${getZoneColor()} ${counter >= 90 ? "animate-pulse" : ""}`}>
        {getZoneLabel()}
      </div>

      {/* Player status */}
      <div className="flex gap-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">YOU</p>
          <p className="text-3xl">{youIn ? "💪" : "🐔"}</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {youIn ? "STILL IN" : "CASHED OUT"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">OPPONENT</p>
          <p className="text-3xl">{theyIn ? "💪" : "🐔"}</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {theyIn ? "STILL IN" : "CASHED OUT"}
          </p>
        </div>
      </div>

      {/* Cash out button */}
      {youIn && (
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-full max-w-xs"
        >
          <Button
            onClick={handleCashOut}
            disabled={cashingOut}
            size="lg"
            className="h-20 w-full bg-green-600 text-2xl font-black hover:bg-green-500 shadow-2xl shadow-green-500/50"
          >
            {cashingOut ? "CASHING OUT..." : "CASH OUT NOW"}
          </Button>
        </motion.div>
      )}

      {/* Pot */}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">POT</p>
        <p className="font-mono text-2xl font-bold text-primary">{potTotal} SOL</p>
        <p className="text-xs text-muted-foreground">Winner gets {potAfterFee.toFixed(4)} SOL</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              counter < 30
                ? "bg-green-500"
                : counter < 60
                ? "bg-yellow-500"
                : counter < 90
                ? "bg-orange-500"
                : "bg-red-500"
            }`}
            style={{ width: `${counter}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">0</span>
          <span className="text-[10px] text-red-500 font-bold">100 = DEATH</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ChickenGame;
