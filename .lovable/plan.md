

# Chicken Game Overhaul: Simulated Trading Battle

## Concept
Replace the boring "click green button first" mechanic with a **60-second simulated trading battle**. Both players see the same realistic market chart (like Jupiter/Raydium) and compete by buying and selling a fake token called `$CHKN`. Whoever has the highest portfolio value when the timer hits zero **wins the pot**.

## How It Works
1. Both players deposit SOL (existing flow, unchanged)
2. Game starts -- each player gets **1,000 virtual USDC**
3. A realistic price chart generates server-side (random walk with momentum, volatility spikes, mean reversion -- like a real shitcoin)
4. Players tap **BUY** or **SELL** at any time to trade `$CHKN` at the current price
5. The chart updates every second with candlestick-style visuals
6. At **60 seconds**, final portfolio = cash + (tokens x final price)
7. **Higher portfolio value wins** the SOL pot. Loser is the "chicken"

## Visual Design
- **Top**: 60-second countdown timer + pot info
- **Center**: Full-width candlestick/area chart (green/red like Jupiter) with price overlay, using recharts (already installed)
- **Bottom**: Portfolio stats (Cash / Tokens / Total Value) + large BUY (green) / SELL (red) buttons
- **Side-by-side scores**: Your value vs Opponent value (opponent's is hidden until game ends for suspense, or shown live for pressure -- we'll show live for max tension)

## Technical Changes

### 1. Database Migration
Add new columns to `chicken_games`:
- `price_history jsonb DEFAULT '[]'` -- array of `{time, open, high, low, close}` candles
- `player_a_cash numeric DEFAULT 1000` -- virtual cash balance
- `player_b_cash numeric DEFAULT 1000`
- `player_a_tokens numeric DEFAULT 0` -- token holdings
- `player_b_tokens numeric DEFAULT 0`
- `player_a_trades jsonb DEFAULT '[]'` -- trade log
- `player_b_trades jsonb DEFAULT '[]'` -- trade log
- `game_duration integer DEFAULT 60` -- seconds

### 2. Edge Function: `chicken-tick` (rewrite)
Instead of incrementing a counter, each tick:
- Generates the next price candle using a realistic algorithm (geometric Brownian motion with volatility clustering + occasional spikes/dumps)
- Appends to `price_history`
- When tick count reaches 60, finishes the game and determines winner by comparing final portfolio values
- Uses the same anti-spam timing and optimistic locking

### 3. New Edge Function: `chicken-trade`
Handles BUY/SELL actions:
- Validates player is in the game
- Executes trade at current price (last candle's close)
- BUY: deduct cash, add tokens
- SELL: deduct tokens, add cash
- Updates `player_X_cash`, `player_X_tokens`, appends to `player_X_trades`
- Returns updated portfolio

### 4. Edge Function: `chicken-cashout` (update)
Instead of "first to cash out wins":
- Called automatically when game timer ends (from tick function)
- Compares `player_a_cash + player_a_tokens * final_price` vs same for player_b
- Higher value = winner, gets the payout
- Tie = mutual destruction (both lose)

### 5. Frontend: `ChickenGame.tsx` (complete rewrite)
New trading UI with:
- **Candlestick chart** using recharts `ComposedChart` with `Bar` for candles + `Line` for price
- Green candles (close > open), red candles (close < open)
- Dark background, glowing price line -- Jupiter/trading terminal aesthetic
- **BUY button** (green, full width) and **SELL button** (red, full width)
- **Portfolio panel**: shows Cash, Tokens held, Current value, P&L percentage
- **Timer**: prominent countdown from 60
- **Live opponent value**: shows their total portfolio value for competitive pressure
- Subscribes to realtime updates on `chicken_games` for price feed + opponent state

### 6. Frontend: `ChickenResult.tsx` (update)
- Show final portfolio comparison (your value vs opponent value)
- Show a mini chart of the full 60-second price history
- Winner = "TRADING LEGEND", Loser = "CHICKEN"
- Keep existing payout display and Solana explorer link

### 7. Frontend: `Chicken.tsx` (lobby update)
- Update lobby description text from "counter climbs" to "trade your way to victory"
- Update game rules copy

## Price Generation Algorithm (server-side)
```text
Starting price: $100
Each tick (1 second):
  - Base drift: slight upward bias (+0.1%)
  - Random component: normal distribution * volatility
  - Volatility: 2-5% per tick, with occasional 10-20% "wick" events
  - Mean reversion: gentle pull toward $100 if price drifts too far
  - Momentum: 30% chance of continuing previous direction
  Result: realistic-looking chart with pumps, dumps, and consolidation
```

## Files to Create/Modify
- **New**: `supabase/functions/chicken-trade/index.ts`
- **Modify**: `supabase/functions/chicken-tick/index.ts` (price generation)
- **Modify**: `supabase/functions/chicken-cashout/index.ts` (portfolio comparison winner)
- **Rewrite**: `src/components/chicken/ChickenGame.tsx` (trading UI)
- **Modify**: `src/components/chicken/ChickenResult.tsx` (portfolio comparison results)
- **Modify**: `src/pages/Chicken.tsx` (lobby copy updates)
- **Migration**: Add new columns to `chicken_games` table

## What Stays the Same
- Deposit flow (SOL staking + escrow)
- Friend challenges + random matchmaking
- Realtime subscriptions architecture
- Payout mechanism (winner gets pot minus 10% fee)
- All wallet adapter code (including the mobile fix we just did)

