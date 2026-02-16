

# Build the /demo Prototype Flow

## What We're Building
A multi-step interactive prototype demo at `/demo` that walks through the full Find60 vision with simulated data. The demo is a guided, step-by-step experience showcasing Tapestry's power -- no real wallet or API needed.

## Demo Flow (5 Steps)

### Step 1: Welcome / Start Demo
- "Experience Find60" intro screen with a "Start Demo" button
- Shows "487 players online" (mocked) for social proof
- Animated entrance

### Step 2: Simulated Wallet Connect + Cross-App Identity Reveal
- Click "Connect Wallet" -- a simulated Phantom wallet connects (animated)
- Wallet address appears (truncated mock address like `7xK9...m3Fp`)
- Then the **big reveal moment**: Tapestry pulls cross-app identity
  - Animated card showing: "Welcome back! Tapestry found your identity"
  - Profile card with mock avatar, username `@cryptosarah`, vibe score 72
  - Badge: "Reputation from Zumichat: 84" and "3 apps connected"
  - Animated reputation bars filling in from different Tapestry apps
- This is the "wow moment" -- user has never used Find60 but already has a score

### Step 3: Mode Selection
- Three mode cards: Finder, Hider, Duel (with icons and descriptions)
- User picks one (pre-selects Finder for the guided demo)
- Shows "Smart Matching..." animation with social graph visualization
- Match found: opponent card reveals with their Tapestry profile

### Step 4: Game Screen (60-Second Countdown)
- Pre-scripted 60-second countdown timer (visual only, auto-plays)
- Clue reveals appearing at intervals
- Mock chat messages between finder and hider
- Timer goes red below 15 seconds
- "FOUND!" success screen at ~43 seconds

### Step 5: Post-Match Results
- Match outcome card with stats (found in 43s, 0.08 SOL earned)
- Vibe score animation updating from 72 to 75
- "Follow on Tapestry" button (mocked)
- Rating buttons (Fire / Good / Meh)
- Cross-app reputation update showing score changes across Find60, Zumichat, ecosystem
- "Play Again" and "Back to Home" buttons

## Architecture

### New Files
- `src/pages/Demo.tsx` -- Main demo page with step state machine
- `src/components/demo/DemoWelcome.tsx` -- Step 1
- `src/components/demo/DemoWalletConnect.tsx` -- Step 2 (wallet + identity reveal)
- `src/components/demo/DemoModeSelect.tsx` -- Step 3
- `src/components/demo/DemoGameplay.tsx` -- Step 4 (timer + clues)
- `src/components/demo/DemoResults.tsx` -- Step 5
- `src/lib/mock-data.ts` -- All mocked Tapestry data (profiles, reputation, match results)

### State Management
- Simple `useState` step counter in Demo.tsx (steps 0-4)
- Each step component receives an `onNext` callback to advance
- Game timer uses `useEffect` + `setInterval` for countdown

### Mock Data
- Mock wallet: `7xK9...m3Fp`
- Mock user profile: `@cryptosarah`, avatar, vibe score 72
- Mock opponent: `@alphahunter`, vibe score 81
- Mock cross-app reputation: Zumichat 84, Find60 72, Global 78
- Mock agent: `AlphaBot`, specialty "speed_finding", win rate 89%
- Mock match result: Found in 43s, 0.08 SOL

### Design
- Clean, minimal layout with generous whitespace
- Purple-to-teal gradient accents (existing design system)
- Framer Motion for all transitions between steps and reveal animations
- Progress indicator at top showing which demo step you're on
- Bold typography for scores, timers, and key moments
- Cards with rounded corners and subtle shadows (existing card components)

## Technical Notes
- No external dependencies needed beyond what's already installed (framer-motion, lucide-react, existing UI components)
- All data is hardcoded mock data -- no API calls
- The 60-second timer auto-plays but can be sped up for demo purposes
- Each step transition uses framer-motion AnimatePresence for smooth crossfades
- Back button available at each step to return to previous step or home

