

# Rebuild Demo: Full Interactive Gameplay Experience

## Overview
Rebuild the `/demo` flow to match the full Find60 game vision with split-screen layout, interactive puzzle fields, hunter/hunted asymmetric experiences, bounty system, and agent integration. The demo will showcase ALL three modes with the Hunter experience as the primary walkthrough.

---

## Step-by-Step Demo Flow (7 Steps, up from 5)

### Step 1: Welcome (minor update)
- Keep current design, add brief explainer text about the 3 modes
- "Experience the hunt. No wallet needed."

### Step 2: Wallet Connect + Identity Reveal (keep as-is)
- Current implementation is solid -- simulated connect, Tapestry identity reveal, cross-app reputation bars

### Step 3: Mode Select (rebuild)
- Show 3 mode cards with updated descriptions matching the branding doc:
  - HUNTER: "Prove you can find me in 60 seconds" 
  - HUNTED: "Make them work to know you"
  - DUEL: "Find each other -- first wins"
- Each card shows matching logic text (e.g., "Hunter matched with Hunted")
- Pre-select HUNTER for the guided demo
- "FIND MATCH" button triggers matching animation
- Matching animation shows Tapestry social graph scanning
- Opponent card reveals with their profile + bounty preview

### Step 4: Game Screen -- HUNTER Experience (complete rebuild)
**Split-screen layout:**

```text
+---------------------------+---------------------------+
|                           |                           |
|       CHAT ZONE           |      PUZZLE ZONE          |
|       (left side)         |      (right side)         |
|                           |                           |
|  Messages scroll here     |  SOLVE THE PUZZLE:        |
|                           |                           |
|  Them: "I love sunny      |  First Name: [________]   |
|   places"                 |  (Clue: "Starts with S")  |
|                           |                           |
|  You: "Beach person?"     |  Twitter: [@________]     |
|                           |  (Locked - no clue yet)   |
|  Them: "Maybe"            |                           |
|                           |  Location: [________]     |
|  CLUE DROPPED:            |  (Locked - no clue yet)   |
|  "I'm in a city-state"    |                           |
|                           |  Timer: 00:47             |
|                           |  Clues: 2/5               |
|                           |  Bounty: 0.05 SOL         |
|                           |                           |
|                           |  [SUBMIT ANSWER]          |
+---------------------------+---------------------------+
```

- **Timer**: 60-second countdown at top, goes yellow at 30s, red/pulsing at 15s
- **Chat zone (left)**: Auto-playing scripted messages + clue drop notifications appear inline
- **Puzzle zone (right)**: Interactive input fields that unlock as clues drop
  - Fields start locked with a lock icon
  - When a clue drops, the corresponding field unlocks with an animation
  - User can type in guesses (pre-filled for demo, but interactive)
  - Wrong guess shows red flash + "-10 points" penalty animation
- **Clue drops**: Timed reveals at 45s, 30s, 15s (auto-clues) with dramatic animation
- **Bounty tracker**: Shows current bounty with time multiplier updating live
- At ~43 seconds remaining, auto-fill correct answers and submit
- **"FOUND!" explosion screen** with confetti-style animation

### Step 5: Game Screen -- HUNTED Experience (new, optional view)
- After the Hunter demo completes, offer: "Want to see the Hunted side?"
- Shows the Hunted perspective:
  - Chat zone (left) -- same chat but from opposite side
  - Clue Control Panel (right) -- "Drop Hint" button, auto-clue countdown, misdirection tools
  - Shows strategic decision-making: when to drop clues, how to mislead
- This step is skippable

### Step 6: Post-Match Results (rebuild)
- **Victory card**: "HUNTED SUCCESSFULLY!" with time and bounty
- **Bounty breakdown**: Base bounty + time multiplier + difficulty bonus = total
- **Profile unlocked**: Full opponent profile revealed with "Send Connection Request" button
- **Vibe score update**: Animated score change with cross-app ripple effect
- **Rating**: Fire / Good / Meh buttons
- **Progression preview**: "You're now a Skilled Hunter (234/500 points)" with progress bar
- **Share card preview**: Auto-generated shareable card showing stats

### Step 7: Agent Demo (new step)
- "Now try hunting an AI agent..."
- Quick 15-second compressed demo showing AI as Hunted
- AI drops faster clues, gives cryptic responses
- Shows the agent solving YOUR puzzle in reverse (AI as Hunter view)
- "I survived an AI hunt" badge showcase
- Badge: "TURING TEST: PASSED"

---

## New/Updated Files

### New Components
- `src/components/demo/DemoGameplayHunter.tsx` -- Split-screen Hunter game (replaces current DemoGameplay)
- `src/components/demo/DemoGameplayHunted.tsx` -- Split-screen Hunted game (new)
- `src/components/demo/DemoAgentDemo.tsx` -- Agent showcase (new)
- `src/components/demo/PuzzleZone.tsx` -- Right-side puzzle fields component
- `src/components/demo/ChatZone.tsx` -- Left-side chat component
- `src/components/demo/BountyTracker.tsx` -- Live bounty display
- `src/components/demo/GameTimer.tsx` -- Reusable countdown timer with urgency states
- `src/components/demo/ShareCard.tsx` -- Auto-generated shareable result card

### Updated Components
- `src/pages/Demo.tsx` -- Expand from 5 to 7 steps, add step labels
- `src/components/demo/DemoModeSelect.tsx` -- Update descriptions, add matching logic text, bounty preview
- `src/components/demo/DemoResults.tsx` -- Add bounty breakdown, progression, share card, connection request
- `src/components/demo/DemoWelcome.tsx` -- Minor copy updates

### Updated Data
- `src/lib/mock-data.ts` -- Add:
  - `MOCK_PUZZLE_FIELDS` -- The puzzle fields (name, twitter, location, profession, fun fact) with clue text and unlock times
  - `MOCK_BOUNTY` -- Base bounty, time multiplier table, difficulty bonuses
  - `MOCK_HUNTED_CLUES` -- Clue arsenal for Hunted perspective  
  - `MOCK_AGENT` -- AI agent profile (AlphaBot)
  - `MOCK_PROGRESSION` -- Hunter/Hunted tier data
  - `MOCK_SHARE_CARD` -- Template for shareable result

---

## Technical Details

### Split-Screen Layout
- Uses CSS Grid (`grid-cols-2`) on desktop, stacks vertically on mobile
- Chat zone scrolls independently with `overflow-y-auto`
- Puzzle zone is sticky/fixed on desktop
- Responsive: on mobile, tabs switch between Chat and Puzzle views

### Puzzle Field Logic
- Fields rendered from `MOCK_PUZZLE_FIELDS` array
- Each field has: `label`, `answer`, `clueText`, `unlockTime`, `isRequired`
- Fields start as `locked` (greyed out with lock icon)
- When timer crosses `unlockTime`, field animates to `unlocked` (glowing border, input enabled)
- User can type (pre-filled after brief delay in demo mode)
- Submit button disabled until all required fields filled
- Wrong submit: red flash animation, -10 points, fields shake

### Bounty Calculation (Visual)
- Base: 0.01 SOL
- Per optional field: +0.01 SOL each
- Time multiplier displayed live: <20s = 0.5x, 20-40s = 1x, 40-55s = 1.5x, 55-60s = 2x
- Final bounty animates on result screen with breakdown

### Chat Auto-Play
- Messages appear at scripted intervals (tied to timer)
- Clue drops appear as special styled messages with a lightbulb icon
- Chat auto-scrolls to latest message
- On mobile, a notification badge appears on the Chat tab when new messages arrive

### Timer Component
- Reusable `GameTimer` with props for duration, urgency thresholds, and callbacks
- Visual states: normal (blue), warning (yellow at 30s), urgent (red pulse at 15s)
- Large bold monospace display
- Progress bar underneath

### Demo Step Navigation
- Steps: INIT, LINK, MODE, HUNT, EVADE (optional), DATA, AGENT
- Step labels in progress bar update
- EVADE step is skippable (button: "Skip" or "See Hunted Side")
- Back button returns to previous step

---

## Design Approach

- Maintain the existing cyberpunk/digital hunt aesthetic with neon accents
- Split screen uses a subtle vertical divider with a glow effect
- Puzzle fields use terminal-style monospace inputs with blinking cursors
- Clue drops have a "data incoming" animation (slide down + flash)
- Bounty tracker pulses green when multiplier increases
- Share card uses the brand gradient background with bold stat typography
- Agent demo uses a distinct purple/violet accent to differentiate from human play

