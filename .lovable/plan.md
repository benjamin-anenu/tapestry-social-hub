

# Fix: Payout Pipeline + Admin Dashboard Improvements

## Root Cause Analysis

The payout system has a **race condition** that causes silent failures:

1. `chicken-tick` updates `chicken_games` to `status = "finished"` with `winner_id`
2. Immediately after, it calls `chicken-cashout` with `autoFinish: true`
3. `chicken-cashout` queries the DB for `status = "finished" AND winner_id = profile.id`
4. If the previous write hasn't propagated, this query returns null -- payout silently fails
5. The error is caught and logged but never surfaced -- the game shows as "finished" with no `payout_tx`

Additionally, `chicken-tick` sets `winner_id` in its own update, but `chicken-cashout` redundantly re-queries for it. This is fragile and unnecessary.

## Fix 1: Eliminate the Race Condition in `chicken-cashout`

**File**: `supabase/functions/chicken-cashout/index.ts`

In the `autoFinish` path, instead of querying for `status = "finished" AND winner_id = profile.id` (which races against the tick's write), simply query by `gameId` alone and verify the winner after fetching:

- Remove `.eq("status", "finished").eq("winner_id", profile.id)` from the query
- Query just `.eq("id", gameId).single()`
- After fetching, check `game.status === "finished"` and `game.winner_id === profile.id`
- If the game isn't finished yet, add a small retry (wait 500ms, re-query once) to handle propagation delay

## Fix 2: Add Payout Failure Tracking

**File**: `supabase/functions/chicken-cashout/index.ts`

Currently if `sendPayout` returns null (tx error) or throws, the error is silently caught. The game stays "finished" with no `payout_tx` and no way to retry or see what happened.

- When payout fails, write a `payout_error` field or log it to a separate column so the admin dashboard can distinguish "payout pending" from "payout failed"
- This requires a small migration to add a `payout_error text` column to `chicken_games`

## Fix 3: Admin Dashboard -- Show Payout Status Clearly

**File**: `src/components/admin/EscrowDashboard.tsx`

Currently the Payout column shows the tx link or "—". This is ambiguous -- "—" could mean "not yet paid" or "payout failed". Improve:

- For finished games with no `payout_tx`: show "FAILED" in red (or "PENDING" in yellow if we add error tracking)
- For active/depositing games: show "—" (expected, game not done)
- Add a summary row at the top: total deposits received, total payouts sent, total fees collected
- Add `platform_fee` column to the transaction table so admins can see the 10% cut per game
- Add `ended_at` to show game duration context

## Fix 4: Deploy the Updated Edge Functions

Both `chicken-tick` and `chicken-cashout` must be redeployed after code changes. The current "Unknown action" error from the earlier conversation was caused by a deploy miss -- we need to ensure both functions are deployed.

## Technical Details

### Migration (new column)
```sql
ALTER TABLE public.chicken_games ADD COLUMN IF NOT EXISTS payout_error text;
```

### `chicken-cashout` autoFinish path fix
```text
Current (broken):
  SELECT * FROM chicken_games WHERE id = gameId AND status = 'finished' AND winner_id = profile.id

Fixed:
  SELECT * FROM chicken_games WHERE id = gameId
  -- Then verify in code: game.status === 'finished' && game.winner_id === profile.id
  -- If game not finished yet, wait 500ms and retry once
  -- If payout fails, UPDATE payout_error = error.message
```

### `EscrowDashboard.tsx` improvements
- Add summary stats row: Total Deposits (sum of stakes where deposited), Total Payouts (count of non-null payout_tx), Total Fees (sum of platform_fee)
- Color-code payout column: green for successful tx, red for failed/missing on finished games
- Add Fee column to transaction table
- Fix the `TxLink` React ref warning (wrap with `forwardRef` or remove ref usage)

### Files to modify
| File | Change |
|------|--------|
| `supabase/functions/chicken-cashout/index.ts` | Fix race condition in autoFinish query; write payout_error on failure |
| `supabase/functions/chicken-tick/index.ts` | No change needed (calls cashout correctly) |
| `src/components/admin/EscrowDashboard.tsx` | Add summary stats, fee column, payout status coloring, fix ref warning |
| `supabase/functions/admin-api/index.ts` | Include `payout_error` in escrow_dashboard response |
| Migration | Add `payout_error` column |

### Deploy
- Redeploy `chicken-cashout` and `admin-api` edge functions after changes
