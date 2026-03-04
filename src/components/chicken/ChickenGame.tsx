import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ChickenChart from "./ChickenChart";
import ChickenPortfolio from "./ChickenPortfolio";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Trade {
  action: "buy" | "sell";
  time: number;
  price: number;
}

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
  const [priceHistory, setPriceHistory] = useState<Candle[]>([]);
  const [myCash, setMyCash] = useState(1000);
  const [myTokens, setMyTokens] = useState(0);
  const [oppValue, setOppValue] = useState(1000);
  const [trading, setTrading] = useState(false);
  const [gameDuration, setGameDuration] = useState(60);
  const [myTrades, setMyTrades] = useState<Trade[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameEndedRef = useRef(false);

  const currentPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].close : 100;
  const myValue = Math.round((myCash + myTokens * currentPrice) * 100) / 100;
  const pnl = Math.round((myValue - 1000) * 100) / 100;
  const timeLeft = Math.max(0, gameDuration - counter);

  const isFreePlay = stakeAmount === 0;

  // Memoize chart data — sliding window of last 30 candles
  const chartCandles = useMemo(() => {
    if (priceHistory.length <= 30) return priceHistory;
    return priceHistory.slice(-30);
  }, [priceHistory]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`chicken-trade-${gameId}`)
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
          const c = game.counter as number;
          setCounter(c);

          const ph = game.price_history as Candle[];
          if (Array.isArray(ph)) setPriceHistory(ph);

          const dur = game.game_duration as number;
          if (dur) setGameDuration(dur);

          // Determine which player we are and update accordingly
          const isA = game.player_a_id === myProfileId;
          if (isA) {
            setMyCash(Number(game.player_a_cash));
            setMyTokens(Number(game.player_a_tokens));
            const trades = game.player_a_trades as Trade[];
            if (Array.isArray(trades)) setMyTrades(trades);
            const price = Array.isArray(ph) && ph.length > 0 ? ph[ph.length - 1].close : 100;
            setOppValue(Math.round((Number(game.player_b_cash) + Number(game.player_b_tokens) * price) * 100) / 100);
          } else {
            setMyCash(Number(game.player_b_cash));
            setMyTokens(Number(game.player_b_tokens));
            const trades = game.player_b_trades as Trade[];
            if (Array.isArray(trades)) setMyTrades(trades);
            const price = Array.isArray(ph) && ph.length > 0 ? ph[ph.length - 1].close : 100;
            setOppValue(Math.round((Number(game.player_a_cash) + Number(game.player_a_tokens) * price) * 100) / 100);
          }

          if (game.status === "finished" && !gameEndedRef.current) {
            gameEndedRef.current = true;
            if (game.winner_id === null) {
              onGameEnd("mutual_destruction", { myValue, oppValue });
            } else if (game.winner_id === myProfileId) {
              onGameEnd("win", { myValue, oppValue });
            } else {
              onGameEnd("lose", { myValue, oppValue });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, myProfileId, onGameEnd, myValue, oppValue]);

  // Drive ticks
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

  const handleTrade = useCallback(async (action: "buy" | "sell") => {
    if (trading || gameEndedRef.current) return;
    setTrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chicken-trade", {
        body: { gameId, walletAddress, action },
      });
      if (error) throw error;
      if (data?.success) {
        setMyCash(data.cash);
        setMyTokens(data.tokens);
      }
    } catch (e) {
      console.error("Trade failed:", e);
    } finally {
      setTrading(false);
    }
  }, [trading, gameId, walletAddress]);

  const potTotal = stakeAmount * 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-3 w-full max-w-lg mx-auto px-2"
    >
      {/* Timer + Price Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">$CHKN</span>
          <span className="font-mono text-xl font-bold text-foreground">
            ${currentPrice.toFixed(2)}
          </span>
        </div>
        <div className={`font-mono text-2xl font-black ${timeLeft <= 10 ? "text-destructive animate-pulse" : "text-primary"}`}>
          {timeLeft}s
        </div>
      </div>

      {/* Pot info — hidden for free play */}
      {!isFreePlay && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>POT: {potTotal} SOL</span>
          <span>Winner gets {(potTotal * 0.9).toFixed(4)} SOL</span>
        </div>
      )}
      {isFreePlay && (
        <div className="text-xs text-muted-foreground text-center">
          🏆 Free Play — Winner gets bragging rights
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: 220 }}>
        <ChickenChart candles={chartCandles} trades={myTrades} />
      </div>

      {/* Portfolio comparison */}
      <ChickenPortfolio
        myCash={myCash}
        myTokens={myTokens}
        myValue={myValue}
        pnl={pnl}
        oppValue={oppValue}
        currentPrice={currentPrice}
      />

      {/* Trade buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleTrade("buy")}
          disabled={trading || myCash <= 0}
          className="h-16 bg-green-600 text-lg font-black hover:bg-green-500 shadow-lg shadow-green-500/30 text-white"
        >
          {trading ? "..." : "BUY ALL"}
        </Button>
        <Button
          onClick={() => handleTrade("sell")}
          disabled={trading || myTokens <= 0}
          className="h-16 bg-red-600 text-lg font-black hover:bg-red-500 shadow-lg shadow-red-500/30 text-white"
        >
          {trading ? "..." : "SELL ALL"}
        </Button>
      </div>

      <p className="text-[10px] text-center text-muted-foreground">
        Buy low, sell high. Highest portfolio value when timer hits 0 {isFreePlay ? "wins!" : "wins the SOL pot."}
      </p>
    </motion.div>
  );
};

export default ChickenGame;
