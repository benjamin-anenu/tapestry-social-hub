

# Game Matching Overhaul: Fast Friend Challenges + Random Arena Matching

## Problem
Right now, "Challenge to Chicken" from a friend chat just dumps you into a generic waiting pool. There's no way to target a specific friend. Two friends clicking the button at different times will never match. The Game Arena has the same issue -- no instant random matching.

## Solution: Two Distinct Flows

### Flow 1: Friend Challenge (Direct Invite)
When you click "Challenge to Chicken" from a friend's chat, it creates a **private game linked to both players** and sends a real-time notification to the friend.

- Add `challenge_target_id` column to `chicken_games` table -- when set, only that specific player can join
- Pass `friendProfileId` from FriendChat to the Chicken page via URL params or route state
- Update `chicken-create` edge function to accept an optional `targetProfileId` -- creates a game that only that friend can join
- Add a real-time listener on the friend's side: when a `chicken_games` row appears with their ID as `player_b_id` or `challenge_target_id`, show an **incoming challenge notification** (accept/decline)
- On accept, instantly transition both players to the deposit phase

### Flow 2: Game Arena (Random Matching with Anyone Online)
When you go through Game Arena and pick Chicken, it matches you with **any online player** instantly.

- Update `chicken-create` to check for ANY waiting game (no target) when no `targetProfileId` is provided
- Add a short timeout (5 seconds) -- if no human found, show "No players available, try again"
- No bots for Chicken (real SOL stakes)

## Technical Steps

### 1. Database Migration
- Add `challenge_target_id` (uuid, nullable) to `chicken_games`
- This separates "open games" (null target) from "friend challenges" (specific target)

### 2. Update `chicken-create` Edge Function
- Accept optional `targetProfileId` parameter
- If `targetProfileId` is set: create game with `challenge_target_id` set, status `"challenge_pending"`
- If no target: look for open waiting games (where `challenge_target_id IS NULL`), join or create one

### 3. New `chicken-respond` Edge Function
- Accepts `{ gameId, walletAddress, accept: boolean }`
- If accepted: sets `player_b_id`, changes status to `"depositing"`
- If declined: deletes the game or sets status `"declined"`

### 4. Update FriendChat Challenge Button
- Pass `friendProfileId` as URL search param: `/play/chicken?challenge=<friendProfileId>`
- Chicken page reads this param and passes it to `chicken-create`

### 5. Add Challenge Notification Component
- New `ChickenChallengeAlert` component shown on the Play hub / Friend Chat
- Subscribes to `chicken_games` via Realtime where `challenge_target_id = myProfileId` and `status = "challenge_pending"`
- Shows challenger name, stake amount, accept/decline buttons
- Accept navigates to `/play/chicken?gameId=<id>` and calls `chicken-respond`

### 6. Update Chicken Page
- Read `challenge` and `gameId` query params
- If `challenge` param: auto-call `chicken-create` with target
- If `gameId` param: skip lobby, go straight to deposit phase (responding to a challenge)
- If neither: show normal lobby for random arena matching

### 7. Update Arena Page
- Enable Chicken for random play (already enabled)
- The random flow works as-is with the updated `chicken-create` (no target = open matching)

## Summary of User Experience

| Scenario | How it works | Speed |
|----------|-------------|-------|
| Friend challenge | Direct invite via Realtime notification | Instant (accept/decline) |
| Arena random | Join open game or create one, next player joins | Fast (seconds) |

