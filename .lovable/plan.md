

# Live Gameplay: GameArena + Bot Behavior Engine

## Overview

This plan connects the "Match Found!" screen to a fully playable game. After matchmaking, the player enters a GameArena that shows a 60-second countdown, live chat, puzzle fields, and clue drops -- all powered by real database state. For bot games, a server-side edge function simulates the AI opponent's behavior in real time.

## What Gets Built

### 1. Enable Realtime on the Games Table
A database migration adds the `games` table to the Realtime publication so the client can subscribe to row-level changes (chat messages appearing, clues being dropped, game status changing).

### 2. RLS Policy for Service Role Bot Updates
The current RLS policies on `games` require `auth.uid()` matching a profile. The bot-gameplay edge function uses the service role key, which bypasses RLS, so no policy changes are needed. However, the client needs to read the game row -- current SELECT policy requires auth. A new permissive SELECT policy will allow reading games by ID for anonymous/wallet-based users (since this app doesn't use Supabase Auth sign-in).

### 3. GameArena Component (`src/components/play/GameArena.tsx`)
A new component that:
- Receives `gameId`, `role`, and `isBot` from PlayLobby
- Fetches the initial game row from the database
- Subscribes to Realtime UPDATE events on the specific game row
- Renders the 60-second GameTimer (real-time, 1 tick/second)
- Shows a split-screen layout: ChatZone (left) + PuzzleZone or CluePanel (right) based on role
- Adapts the existing demo components to work with live JSONB data instead of mock constants
- Displays game-over state (FOUND / SURVIVED / CAUGHT) when the game ends

### 4. Update PlayLobby to Transition into GameArena
After "Match Found!" displays for ~2 seconds:
- Store `gameId` in state
- Auto-transition to render `<GameArena>` instead of the match-found card
- Pass `gameId`, `role`, `isBot`, and `walletAddress` as props

### 5. Bot Gameplay Edge Function (`supabase/functions/bot-gameplay/index.ts`)
Called once by the client when a bot game starts. Runs server-side for ~15 seconds, simulating the bot's actions:

**Bot as Hunted (player is Hunter):**
- Sets `started_at` and initializes `puzzle_fields` with themed data based on bot identity
- Appends chat messages to `chat_log` at 2-3 second intervals (personality-scripted)
- Appends clue drops to `clues_dropped` at scheduled intervals
- Waits for the player to submit a correct solve or for the function to finish

**Bot as Hunter (player is Hunted):**
- Sets `started_at`
- Appends probing chat messages to `chat_log`
- At a random time (8-12 seconds into the function), sets `hunter_won = true`, `solved_at`, and `status = 'completed'`

**Bot in Duel mode:**
- Combines both behaviors

### 6. Update Matchmaking to Initialize Game State
When creating a bot game, the matchmaking function will set `started_at = now()` and populate initial `puzzle_fields` based on the bot's identity so the game is immediately playable.

## Data Flow

```text
Client (PlayLobby)
  |-- POST /matchmaking --> returns { gameId, isBot: true }
  |
  v
Client (GameArena)
  |-- Subscribes to Realtime on games WHERE id = gameId
  |-- POST /bot-gameplay { gameId }  (fire-and-forget)
  |
  v
Edge Function (bot-gameplay)
  |-- sleep(2s) --> UPDATE games SET chat_log = [..., msg1]
  |-- sleep(3s) --> UPDATE games SET chat_log = [..., msg2], clues_dropped = [..., clue1]
  |-- sleep(3s) --> UPDATE games SET chat_log = [..., msg3]
  |-- ...continues for ~15 seconds...
  |-- Final: UPDATE games SET status = 'completed', ended_at = now()
  |
  v
Client receives each UPDATE via Realtime
  |-- Re-renders ChatZone with new messages
  |-- Re-renders PuzzleZone with new clues/unlocked fields
  |-- Shows game-over when status = 'completed'
```

## Bot Personality Message Banks

| Bot Name | Role | Sample Messages |
|----------|------|----------------|
| Shadow Protocol | Hunted | "You'll never find me.", "Getting warmer... or not.", "I'm always one step ahead." |
| GhostSignal | Hunted | "Signal lost.", "I exist between the blocks.", "Catch my shadow if you can." |
| Agent Viper | Hunter | "Scanning your graph...", "I see your connections.", "Target acquired." |
| NeonWraith | Hunter | "Your data trail glows.", "Processing identity matrix...", "Almost there." |
| CipherPunk | Duel | "Let's see who's faster.", "Encrypting my tracks.", "Your move." |
| DarkMatter | Duel | "You can't see what isn't there.", "Running analysis...", "Interesting patterns." |

## Files Changed

| File | Action |
|------|--------|
| Database migration | Enable Realtime on games table + add permissive SELECT policy |
| `supabase/functions/bot-gameplay/index.ts` | Create -- bot simulation engine |
| `supabase/config.toml` | Add bot-gameplay function config |
| `src/components/play/GameArena.tsx` | Create -- live gameplay UI |
| `src/components/play/PlayLobby.tsx` | Modify -- transition to GameArena after match |
| `supabase/functions/matchmaking/index.ts` | Modify -- initialize puzzle_fields on bot game creation |

## Technical Details

- The GameTimer will run at real speed (1 tick/second) in live games, not the demo's accelerated 600ms speed
- The bot-gameplay function compresses 60 seconds of "game time" into ~15 seconds of real execution to keep things snappy
- Bot puzzle fields use themed data (e.g., Shadow Protocol's location = "The Void", profession = "Signal Jammer")
- The edge function uses `Deno.sleep()` style delays between database writes
- Chat messages use the existing `ChatZone` component format: `{ time, sender, text }`
- Puzzle fields use the existing `PuzzleField` interface: `{ id, label, placeholder, answer, clueText, unlockTime, isRequired }`

