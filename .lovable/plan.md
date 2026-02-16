

# AI Gameplay Behavior for Bot Matches

## Summary

After matchmaking returns a game, there's currently no live gameplay screen — only the demo uses mock data. This plan builds a real gameplay flow that launches after matchmaking, with AI bots that actively send chat messages, drop clues, and "solve" puzzles during bot games.

## Architecture

The approach uses a single new Edge Function (`bot-gameplay`) that simulates bot behavior server-side, writing actions to the `games` table's JSONB columns (`chat_log`, `clues_dropped`, `puzzle_fields`). The client subscribes to real-time updates on the game row to render bot actions live.

```text
[Player clicks Find Match]
        |
        v
[matchmaking returns gameId + isBot]
        |
        v
[PlayLobby transitions to GameArena component]
  -- subscribes to games row via Realtime
  -- if isBot: calls bot-gameplay edge function
        |
        v
[bot-gameplay edge function]
  -- Loads game + bot profile
  -- Runs a timed loop (server-side):
     - Appends chat messages to chat_log JSONB
     - Appends clue drops to clues_dropped JSONB  
     - If bot is Hunter: "solves" puzzle at a random time
     - If bot is Hunted: drops clues on schedule
  -- Updates game status when complete
        |
        v
[Client sees updates via Realtime]
  -- Chat messages appear
  -- Clues reveal
  -- Game ends when bot solves or timer expires
```

## Step 1: Create the Game Arena Component

A new `src/components/play/GameArena.tsx` component that:
- Receives `gameId`, `role`, and `isBot` from PlayLobby
- Fetches the game row from the database
- Subscribes to Realtime updates on the game row
- Renders the existing ChatZone + PuzzleZone (or Clue Control Panel for Hunted)
- Uses real data from the game's JSONB columns instead of mock data
- Manages the 60-second timer client-side

## Step 2: Update PlayLobby to Transition to GameArena

After matchmaking returns `status: "matched"`:
- Store the `gameId` in state
- Transition from the "Match Found!" screen to the GameArena component
- Pass `gameId`, `role`, and `isBot` to GameArena

## Step 3: Create bot-gameplay Edge Function

New file: `supabase/functions/bot-gameplay/index.ts`

This function is called once when a bot game starts. It:
1. Loads the game row and bot profile
2. Initializes `puzzle_fields` on the game (from a template or defaults)
3. Uses `setTimeout`-style sequential updates to simulate bot actions over ~60 seconds (compressed to run in ~10-15 seconds for responsiveness):

**If the bot is the Hunted (player is Hunter):**
- Writes chat messages to `chat_log` at intervals (themed per bot personality)
- Drops clues to `clues_dropped` at scheduled intervals (45s, 30s, 15s remaining)
- Waits for the player to solve or time to expire

**If the bot is the Hunter (player is Hunted):**
- Writes probing chat messages to `chat_log`
- Attempts to "solve" the puzzle at a random time (30-50 seconds in)
- Updates `hunter_won`, `solved_at`, and game `status`

Bot chat messages are pre-scripted per bot personality (no AI model calls needed — keeps it simple and fast).

## Step 4: Enable Realtime on Games Table

Database migration:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
```

This lets the client subscribe to changes on the game row.

## Step 5: Initialize Game State on Match

Update the `matchmaking` edge function to populate initial `puzzle_fields` when creating a bot game, so the game is ready to play immediately.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/bot-gameplay/index.ts` | Create | Bot behavior engine |
| `src/components/play/GameArena.tsx` | Create | Live gameplay screen |
| `src/components/play/PlayLobby.tsx` | Modify | Transition to GameArena after match |
| `supabase/functions/matchmaking/index.ts` | Modify | Initialize puzzle_fields on game creation |
| Database migration | Add | Enable Realtime on games table |

## Bot Personality Scripts

Each bot has pre-written message sets based on their name:

- **Agent Viper / NeonWraith** (Hunter bots): Aggressive, fast messages like "Scanning your graph...", "I see your connections.", "Target acquired."
- **Shadow Protocol / GhostSignal** (Hunted bots): Evasive, playful messages like "You'll never find me.", "Getting warmer... or not.", "I'm always one step ahead."
- **CipherPunk / DarkMatter** (Duel bots): Mix of both styles.

## Technical Notes

- Bot actions use sequential database updates with `sleep()` delays in the edge function (Deno supports this natively)
- Edge function timeout is 60 seconds by default, which matches the game duration
- No AI model calls needed — pre-scripted messages keep latency minimal and costs zero
- The client polls or subscribes via Realtime for game state changes
- Game completion updates `status` to "completed", `hunter_won` to true/false, and `ended_at`

