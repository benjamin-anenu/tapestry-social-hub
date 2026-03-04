

# Plan: Chicken Game Enhancements + Admin Retry Payout

## 1. Free Play Mode (No Stake)

**Files**: `src/pages/Chicken.tsx`, `supabase/functions/chicken-create/index.ts`, `supabase/functions/chicken-tick/index.ts`, `supabase/functions/chicken-cashout/index.ts`

**Lobby UI changes** (`Chicken.tsx`):
- Add a toggle/switch: "Stake SOL" vs "Free Play" above the stake input
- When "Free Play" is selected, hide the stake input and set `stakeAmount = 0`
- Pass `stakeAmount: 0` to `chicken-create`
- When `stakeAmount === 0`, skip the deposit phase entirely — go straight from matched → active
- Update lobby text: show "Winner gets bragging rights" instead of SOL amounts when free

**Backend changes** (`chicken-create`):
- Accept `stakeAmount: 0` — match free games with free games, staked with staked (already filters by `stake_amount`)

**Backend changes** (`chicken-tick`):
- When game ends and `stake_amount === 0`, skip the cashout function call entirely — just set status to finished with winner

**Deposit skip** (`Chicken.tsx`):
- When realtime update shows `status === "depositing"` but `stakeAmount === 0`, immediately update game to `active` via a new edge function call or handle it in `chicken-create` by setting status directly to `active` when both matched and stake is 0

Actually simpler: in `chicken-create`, when `stakeAmount === 0` and a match is found, set status to `active` + `started_at` directly instead of `depositing`. The lobby component already transitions based on status. For the waiting→active path (no match yet), the joining player's `chicken-create` call sets it to `active` directly.

## 2. Custom Game Duration

**Files**: `src/pages/Chicken.tsx`, `supabase/functions/chicken-create/index.ts`

**Lobby UI** (`Chicken.tsx`):
- Add a duration selector below the stake input: preset buttons for 60s, 90s, 120s, 180s
- Default selected: 60s
- Pass `gameDuration` to `chicken-create`

**Backend** (`chicken-create`):
- Accept optional `gameDuration` param (default 60, max 300)
- Store it in the `game_duration` column on insert
- For arena matching, also filter by `game_duration` so players only match with same duration

**UI update** (`Chicken.tsx`):
- Update the title from "60-SECOND TRADING BATTLE" to show the selected duration dynamically

## 3. Trade Markers on Chart

**Files**: `src/components/chicken/ChickenChart.tsx`, `src/components/chicken/ChickenGame.tsx`

**Pass trades to chart** (`ChickenGame.tsx`):
- Track `myTrades` array from realtime updates (player_a_trades or player_b_trades)
- Pass `myTrades` to `ChickenChart`

**Render markers** (`ChickenChart.tsx`):
- Accept a `trades` prop: `{ action: "buy"|"sell", time: number, price: number }[]`
- Render `ReferenceDot` components from recharts at each trade point
- Buy markers: green upward triangle/dot
- Sell markers: red downward triangle/dot
- Use custom dot render for triangle shapes

## 4. Smoother Chart Experience

**Files**: `src/components/chicken/ChickenChart.tsx`, `src/components/chicken/ChickenGame.tsx`

The chart is slow because:
1. `isAnimationActive={false}` means no smooth transitions between data points
2. Each tick replaces the entire data array, causing a full re-render
3. The `ResponsiveContainer` recalculates on every render

**Fixes**:
- Enable animation: set `isAnimationActive={true}` with `animationDuration={300}` and `animationEasing="linear"` for smooth line movement
- Use a unique `chartGrad-${gameId}` gradient ID to avoid SVG conflicts
- Memoize the chart data transformation with `useMemo` in ChickenGame to prevent unnecessary re-renders
- Keep only the last 30 candles visible (sliding window) to reduce render load while showing full history for context via a dimmed background line

## 5. Admin: Retry Payout Button

**Files**: `src/components/admin/EscrowDashboard.tsx`, `supabase/functions/admin-api/index.ts`

**Backend** (`admin-api`):
- Add `retry_payout` action: takes `gameId`, fetches the finished game, gets the winner's wallet address from profiles, calls `sendPayout` with the same logic as `chicken-cashout`, updates `payout_tx` on success or `payout_error` on failure

**Frontend** (`EscrowDashboard.tsx`):
- In `PayoutCell`, when status is FAILED or MISSING, add a small "Retry" button next to the label
- On click, call `admin-api` with `{ action: "retry_payout", walletAddress, gameId: tx.id }`
- Show loading spinner during retry, toast on success/failure
- Refresh escrow data after retry

## 6. Verify Escrow Dashboard

This is a manual verification step after implementation. The dashboard already has summary stats, fee column, and payout status. After implementing the retry button and deploying, we verify it renders correctly.

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/pages/Chicken.tsx` | Free play toggle, duration selector, skip deposit when free |
| `src/components/chicken/ChickenGame.tsx` | Pass trades to chart, memoize data, hide pot info when free |
| `src/components/chicken/ChickenChart.tsx` | Trade markers (ReferenceDot), smooth animation, sliding window |
| `supabase/functions/chicken-create/index.ts` | Accept `gameDuration`, handle `stakeAmount=0` (skip deposit phase) |
| `supabase/functions/chicken-tick/index.ts` | Skip cashout call when `stake_amount=0` |
| `src/components/admin/EscrowDashboard.tsx` | Retry payout button in PayoutCell |
| `supabase/functions/admin-api/index.ts` | Add `retry_payout` action |

Edge functions to redeploy: `chicken-create`, `chicken-tick`, `admin-api`

