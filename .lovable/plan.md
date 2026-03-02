

# CHICKEN Game - Full Implementation Plan

## Overview
Build a real-time "Chicken" nerve game where two players stake SOL into an escrow wallet. A counter climbs from 1 to 100. The first player to cash out WINS the pot (minus 10% platform fee). If both wait until 100, both lose and the platform keeps everything.

---

## Architecture

```text
+------------------+       +-------------------+       +------------------+
|   Player A       |       |   Edge Functions   |       |   Player B       |
|   (React + Wallet)|<---->|   (Game Server)    |<----->|   (React + Wallet)|
+------------------+       +-------------------+       +------------------+
        |                          |                            |
        |   Send SOL to escrow     |                            |
        |------------------------->|<---------------------------|
        |                          |                            |
        |        Realtime DB       |                            |
        |<---- counter ticks ----->|<---- counter ticks ------->|
        |                          |                            |
        |   "CASH OUT" action      |                            |
        |------------------------->|                            |
        |                          |--- payout SOL to winner -->|
        |                          |   (from escrow wallet)     |
```

---

## 1. Database Changes

### New table: `chicken_games`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| player_a_id | uuid | profile ID |
| player_b_id | uuid | nullable (waiting for opponent) |
| stake_amount | numeric | SOL per player (default 0.05) |
| platform_fee | numeric | 10% of total pot |
| counter | integer | current value 0-100 |
| status | text | waiting, depositing, active, finished |
| player_a_deposited | boolean | confirmed on-chain |
| player_b_deposited | boolean | confirmed on-chain |
| player_a_tx | text | deposit transaction signature |
| player_b_tx | text | deposit transaction signature |
| cashed_out_by | uuid | profile ID of winner (first to cash out) |
| cashed_out_at | integer | counter value when cashed out |
| payout_tx | text | payout transaction signature |
| winner_id | uuid | null if both lose |
| created_at | timestamptz | |
| started_at | timestamptz | when counter begins |
| ended_at | timestamptz | |

### Add `chicken` to game_role enum
- ALTER TYPE game_role ADD VALUE 'chicken'

### Enable Realtime
- ALTER PUBLICATION supabase_realtime ADD TABLE chicken_games

### RLS Policies
- SELECT: anyone can view (spectator mode)
- UPDATE: only via service role (edge functions control state)
- INSERT: only via service role

---

## 2. Escrow Wallet Setup

### Secret needed: `ESCROW_WALLET_PRIVATE_KEY`
- Generate a new Solana keypair (devnet for hackathon)
- Store the private key as a backend secret
- The public address is derived server-side and sent to clients for deposits

### Edge function: `chicken-escrow-info`
- Returns the escrow wallet public address to the client
- Client builds a SOL transfer transaction to this address
- Client signs with their wallet and submits to Solana network

---

## 3. Edge Functions

### `chicken-create` - Create or join a game
- If a waiting game exists with matching stake, join it as player_b
- Otherwise create a new game as player_a with status "waiting"
- Returns game ID and escrow wallet address

### `chicken-deposit` - Verify deposit
- Player submits their transaction signature
- Edge function checks the Solana blockchain to confirm:
  - Correct amount sent to escrow address
  - Transaction is finalized
- Marks player_a_deposited or player_b_deposited = true
- When BOTH deposited, sets status to "active" and started_at = now()

### `chicken-tick` - Counter heartbeat (server-driven)
- Called by a setInterval on the client (or server cron)
- Increments counter by 1 every ~1 second
- Updates the chicken_games row (triggers Realtime to both clients)
- If counter reaches 100: status = "finished", no winner, platform keeps pot

### `chicken-cashout` - Player cashes out
- Validates the player is in the game and game is active
- Sets cashed_out_by = player profile ID, cashed_out_at = current counter
- Calculates payout: (stake x 2) - 10% fee
- Transfers SOL from escrow wallet to winner's wallet address
- Stores payout_tx signature
- Sets status = "finished", winner_id

### `chicken-bot-gameplay` - NOT NEEDED
- Human vs human only per your request

---

## 4. Client Flow

### New route: `/play/chicken`
### New page: `src/pages/Chicken.tsx`

**Phase 1: Lobby**
- Show current stake amount (0.05 SOL)
- "FIND OPPONENT" button
- Calls `chicken-create`, gets game ID
- If waiting, show "Waiting for opponent..." with Realtime subscription

**Phase 2: Deposit**
- Both players matched
- Show escrow address and "DEPOSIT 0.05 SOL" button
- Client builds `SystemProgram.transfer` transaction
- User signs with Phantom/Solflare
- Submit tx signature to `chicken-deposit`
- Show deposit status for both players

**Phase 3: Active Game**
- Full-screen counter (huge number, center screen)
- Color zones: green (1-30), yellow (30-60), orange (60-90), red pulsing (90-100)
- Player status indicators (YOU: still in, OPPONENT: still in)
- Giant "CASH OUT NOW" button
- Pot display
- Realtime subscription updates counter + opponent status

**Phase 4: Result**
- Win: confetti-style animation, show payout amount and tx link
- Lose: "CHICKEN" label, show what you lost
- Both lose (counter 100): "MUTUAL DESTRUCTION" screen

### New component: `src/components/chicken/ChickenGame.tsx`
- The main game UI with counter, status, cash out button
- Subscribes to Realtime updates on chicken_games table

### New component: `src/components/chicken/ChickenDeposit.tsx`
- Handles the SOL deposit flow with wallet adapter

### New component: `src/components/chicken/ChickenResult.tsx`
- Win/loss/draw result screen

---

## 5. Solana Integration Details

### Client-side deposit (in ChickenDeposit):
```text
1. Get escrow public key from chicken-escrow-info
2. Build SystemProgram.transfer instruction
3. Sign with useWallet().sendTransaction()
4. Send tx signature to chicken-deposit for verification
```

### Server-side payout (in chicken-cashout):
```text
1. Load escrow keypair from ESCROW_WALLET_PRIVATE_KEY secret
2. Build SystemProgram.transfer from escrow to winner
3. Sign with escrow keypair
4. Submit transaction to Solana RPC
5. Store signature in chicken_games.payout_tx
```

### Network: devnet for hackathon (switch WalletProvider endpoint)

---

## 6. Counter Synchronization

The counter must be server-authoritative to prevent cheating:
- Client A calls `chicken-tick` every 1 second
- Edge function only increments if enough real time has passed (anti-spam)
- Both clients receive updates via Realtime subscription on the chicken_games row
- Either client can drive the tick (first one wins, deduped server-side)

---

## 7. MainHub Update

Add a new card to MainHub for "Chicken":
- Title: "Chicken"
- Desc: "Stake SOL, test your nerve"
- Icon: custom chicken/flame icon
- Path: `/play/chicken`
- Enabled (not disabled)

---

## 8. File Summary

| File | Action |
|------|--------|
| `supabase/functions/chicken-create/index.ts` | New - matchmaking |
| `supabase/functions/chicken-deposit/index.ts` | New - verify SOL deposit |
| `supabase/functions/chicken-tick/index.ts` | New - increment counter |
| `supabase/functions/chicken-cashout/index.ts` | New - payout logic |
| `supabase/functions/chicken-escrow-info/index.ts` | New - return escrow address |
| `src/pages/Chicken.tsx` | New - page with phases |
| `src/components/chicken/ChickenGame.tsx` | New - main game UI |
| `src/components/chicken/ChickenDeposit.tsx` | New - deposit flow |
| `src/components/chicken/ChickenResult.tsx` | New - result screen |
| `src/components/play/MainHub.tsx` | Edit - add Chicken card |
| `src/App.tsx` | Edit - add /play/chicken route |
| `supabase/config.toml` | Auto-updated for new functions |
| DB migration | New table + enum + realtime |

---

## 9. What You Need To Do

Before I start building:
1. **Generate an escrow wallet keypair** - I will ask you to paste the private key as a secret so the backend can sign payout transactions
2. The wallet provider will need to switch to **devnet** for testing with free SOL (currently on mainnet-beta)

---

## 10. Security Notes

- Counter is server-authoritative (no client manipulation)
- Deposits verified on-chain before game starts
- Payouts only from server with escrow key
- RLS restricts direct table writes; all mutations go through edge functions with service role
- 10% fee ensures platform sustainability
- Double cash-out race condition handled by checking cashed_out_by before updating

