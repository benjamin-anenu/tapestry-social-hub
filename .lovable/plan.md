

# Add AI Bot Opponents to Matchmaking

## Overview

When a player clicks "Find Match" and no human opponent is available, an AI bot will automatically fill the opposite role so the player gets matched instantly. No more waiting in queue.

## How It Works

```text
Player clicks "Find Match"
        |
        v
  [matchmaking edge function]
  Insert player into queue
  Look for human opponent
        |
    Found? ----YES----> Create game (existing logic)
        |
       NO
        |
        v
  [Create/find a bot profile]
  Bot wallet: "BOT_hunter_001" etc.
  Bot username: "Agent Viper", "Shadow Protocol", etc.
        |
        v
  [Insert bot into queue as opponent]
  Opposite role, matching stake
        |
        v
  [Create game immediately]
  Return matched status with gameId
  Mark game as bot game (is_bot_game = true)
```

## Step 1: Add `is_bot` Column to Profiles and `is_bot_game` to Games

A small database migration:
- `profiles.is_bot` (boolean, default false) -- marks bot profiles
- `games.is_bot_game` (boolean, default false) -- marks games against bots

This lets the UI show "vs AI" badges and lets the leaderboard filter bot games if desired.

## Step 2: Seed Bot Profiles

Pre-create 6 bot profiles in the database with themed names and varied stats so they feel like real opponents:

| Username | Role Affinity | Vibe Score |
|----------|--------------|------------|
| Agent Viper | hunter | 72 |
| Shadow Protocol | hunted | 58 |
| NeonWraith | hunter | 85 |
| GhostSignal | hunted | 63 |
| CipherPunk | duel | 77 |
| DarkMatter | duel | 50 |

Each gets a fake wallet address like `BOT_agent_viper` and `is_bot = true`.

## Step 3: Update Matchmaking Edge Function

Modify `supabase/functions/matchmaking/index.ts` to add bot fallback logic:

After the existing "look for human opponent" query returns no result:
1. Pick a random bot profile that plays the opposite role
2. Insert a queue entry for the bot
3. Create the game immediately
4. Return `{ status: "matched", gameId, isBot: true }`

The key change is roughly 30 lines added after the existing opponent search block.

## Step 4: Update Frontend to Show Bot Indicator

Update `PlayLobby.tsx` to display "vs AI Agent" when `isBot: true` is returned from matchmaking, so players know they're facing a bot.

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Add columns | `profiles.is_bot`, `games.is_bot_game` |
| Database migration | Seed data | Insert 6 bot profiles |
| `supabase/functions/matchmaking/index.ts` | Update | Bot fallback when no human found |
| `src/components/play/PlayLobby.tsx` | Update | Show "vs AI" indicator |

## Technical Notes

- Bots are matched server-side only -- no separate bot service needed
- Bot profiles use fake wallet addresses (prefixed `BOT_`) that can never conflict with real Solana addresses
- The actual AI gameplay behavior (bot making moves, solving puzzles) is a separate future step -- this change only ensures instant matching
- Bot games can optionally be excluded from leaderboard rankings using the `is_bot_game` flag

