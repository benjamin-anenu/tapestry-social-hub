import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Box-Muller transform for normal distribution
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function generateNextCandle(history: Candle[], tickIndex: number): Candle {
  const prevPrice = history.length > 0 ? history[history.length - 1].close : 100;

  let volatility = 0.03;
  if (Math.random() < 0.08) volatility = 0.12 + Math.random() * 0.1;
  if (Math.random() < 0.03) volatility = 0.2 + Math.random() * 0.15;

  let momentum = 0;
  if (history.length >= 2) {
    const prevMove = history[history.length - 1].close - history[history.length - 2].close;
    if (Math.random() < 0.3) momentum = Math.sign(prevMove) * 0.01;
  }

  const meanReversion = (100 - prevPrice) * 0.005;
  const drift = 0.001;

  const change = drift + momentum + meanReversion + volatility * randomNormal();
  const closePrice = Math.max(1, prevPrice * (1 + change));

  const open = prevPrice;
  const mid1 = open + (closePrice - open) * (0.3 + Math.random() * 0.4);
  const wickUp = Math.abs(randomNormal()) * volatility * prevPrice * 0.5;
  const wickDown = Math.abs(randomNormal()) * volatility * prevPrice * 0.5;
  const high = Math.max(open, closePrice, mid1) + wickUp;
  const low = Math.max(1, Math.min(open, closePrice, mid1) - wickDown);

  return {
    time: tickIndex,
    open: Math.round(open * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(closePrice * 100) / 100,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { gameId } = await req.json();
    if (!gameId) throw new Error("gameId is required");

    const { data: game, error: gameErr } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameErr || !game) throw new Error("Game not found");
    if (game.status !== "active") {
      return new Response(
        JSON.stringify({ price_history: game.price_history, status: game.status, counter: game.counter }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-spam: at least 800ms per tick
    const startedAt = new Date(game.started_at).getTime();
    const expectedTime = startedAt + game.counter * 1000;
    const now = Date.now();
    if (now < expectedTime + 800) {
      return new Response(
        JSON.stringify({ price_history: game.price_history, status: game.status, counter: game.counter }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newCounter = game.counter + 1;
    const history: Candle[] = Array.isArray(game.price_history) ? game.price_history : [];
    const newCandle = generateNextCandle(history, newCounter);
    const newHistory = [...history, newCandle];

    // Game over at configured duration
    if (newCounter >= game.game_duration) {
      const finalPrice = newCandle.close;
      const aValue = Number(game.player_a_cash) + Number(game.player_a_tokens) * finalPrice;
      const bValue = Number(game.player_b_cash) + Number(game.player_b_tokens) * finalPrice;

      let winnerId: string | null = null;
      let result = "mutual_destruction";
      if (aValue > bValue) {
        winnerId = game.player_a_id;
        result = "winner_a";
      } else if (bValue > aValue) {
        winnerId = game.player_b_id;
        result = "winner_b";
      }

      await supabase
        .from("chicken_games")
        .update({
          counter: newCounter,
          price_history: newHistory,
          status: "finished",
          ended_at: new Date().toISOString(),
          winner_id: winnerId,
          cashed_out_at: newCounter,
        })
        .eq("id", gameId)
        .eq("status", "active");

      // Only trigger payout if there's a winner AND it's a staked game
      if (winnerId && Number(game.stake_amount) > 0) {
        const { data: winnerProfile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", winnerId)
          .single();

        if (winnerProfile) {
          try {
            await supabase.functions.invoke("chicken-cashout", {
              body: { gameId, walletAddress: winnerProfile.wallet_address, autoFinish: true },
            });
          } catch (e) {
            console.error("Auto-payout failed:", e);
          }
        }
      }

      return new Response(
        JSON.stringify({
          counter: newCounter,
          status: "finished",
          result,
          price_history: newHistory,
          player_a_value: Math.round(aValue * 100) / 100,
          player_b_value: Math.round(bValue * 100) / 100,
          winner_id: winnerId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normal tick
    const { error: updateErr } = await supabase
      .from("chicken_games")
      .update({
        counter: newCounter,
        price_history: newHistory,
      })
      .eq("id", gameId)
      .eq("status", "active")
      .eq("counter", game.counter);

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ counter: newCounter, status: "active", price_history: newHistory }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chicken-tick error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
