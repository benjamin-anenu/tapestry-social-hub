import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { gameId, walletAddress, action, amount } = await req.json();
    if (!gameId || !walletAddress || !action) {
      throw new Error("gameId, walletAddress, and action (buy/sell) required");
    }
    if (action !== "buy" && action !== "sell") {
      throw new Error("action must be 'buy' or 'sell'");
    }

    // Get player profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();
    if (!profile) throw new Error("Profile not found");

    // Get game
    const { data: game, error: gameErr } = await supabase
      .from("chicken_games")
      .select("*")
      .eq("id", gameId)
      .eq("status", "active")
      .single();

    if (gameErr || !game) throw new Error("Game not active");

    const isPlayerA = game.player_a_id === profile.id;
    const isPlayerB = game.player_b_id === profile.id;
    if (!isPlayerA && !isPlayerB) throw new Error("You are not in this game");

    // Get current price from last candle
    const history = Array.isArray(game.price_history) ? game.price_history : [];
    if (history.length === 0) throw new Error("No price data yet");
    const currentPrice = history[history.length - 1].close;

    const cashField = isPlayerA ? "player_a_cash" : "player_b_cash";
    const tokensField = isPlayerA ? "player_a_tokens" : "player_b_tokens";
    const tradesField = isPlayerA ? "player_a_trades" : "player_b_trades";

    let cash = Number(game[cashField]);
    let tokens = Number(game[tokensField]);
    const trades = Array.isArray(game[tradesField]) ? [...game[tradesField]] : [];

    let tradeAmount: number;

    if (action === "buy") {
      // Buy with specified amount of cash, or all cash
      const spendAmount = amount ? Math.min(Number(amount), cash) : cash;
      if (spendAmount <= 0) throw new Error("No cash to buy with");
      tradeAmount = spendAmount / currentPrice;
      cash -= spendAmount;
      tokens += tradeAmount;
      trades.push({ action: "buy", price: currentPrice, amount: tradeAmount, spent: spendAmount, time: game.counter });
    } else {
      // Sell specified amount of tokens, or all tokens
      const sellAmount = amount ? Math.min(Number(amount), tokens) : tokens;
      if (sellAmount <= 0) throw new Error("No tokens to sell");
      tradeAmount = sellAmount;
      const proceeds = sellAmount * currentPrice;
      tokens -= sellAmount;
      cash += proceeds;
      trades.push({ action: "sell", price: currentPrice, amount: sellAmount, proceeds, time: game.counter });
    }

    // Round to avoid floating point issues
    cash = Math.round(cash * 100) / 100;
    tokens = Math.round(tokens * 10000) / 10000;

    const { error: updateErr } = await supabase
      .from("chicken_games")
      .update({
        [cashField]: cash,
        [tokensField]: tokens,
        [tradesField]: trades,
      })
      .eq("id", gameId)
      .eq("status", "active");

    if (updateErr) throw updateErr;

    const totalValue = Math.round((cash + tokens * currentPrice) * 100) / 100;

    return new Response(
      JSON.stringify({
        success: true,
        cash,
        tokens,
        currentPrice,
        totalValue,
        tradeCount: trades.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chicken-trade error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
