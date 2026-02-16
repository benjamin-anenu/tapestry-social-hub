

# Find60 × Tapestry — Build Plan

## Overview
Find60 is a 60-second social puzzle game built on Tapestry's open social graph (Solana). The app has two modes accessible via separate routes: **Real Game** (`/play`) with actual Tapestry integration and wallet connection, and **Prototype Demo** (`/demo`) with fully mocked data to showcase the complete vision.

---

## Page Structure

### 1. Landing Page (`/`)
A clean, vibrant hero page introducing Find60. Two prominent CTAs:
- **"Play for Real"** → navigates to `/play` (real wallet + real Tapestry API)
- **"Explore Demo"** → navigates to `/demo` (simulated wallet + mocked everything)

Includes animated logo, tagline ("The most interesting minute of your day"), and a brief explainer of how Tapestry powers it.

### 2. Real Game Flow (`/play`)
- **Wallet Connect** — Real Phantom/Solflare connection via Solana wallet adapter
- **Tapestry Profile** — Creates/loads profile using real `socialfi` API (profiles, follows, likes). Advanced features (cross-app reputation, vibe score) shown with mocked data alongside real profile data
- **Mode Select** — Choose between:
  - 🔍 **Finder vs Hider (Multiplayer)** — Real-time match with another player
  - 🤖 **Finder vs AI Agent** — Play against a simulated Tapestry agent
  - 🧩 **Solo Puzzle** — Timed solo challenge
- **Game Screen** — 60-second countdown timer, puzzle/clue interface, live score
- **Post-Match** — Results screen showing match outcome, reputation update animation, option to follow opponent on Tapestry (real API), rate the match (fire/good/meh), and see updated stats
- **Profile & Stats** (`/play/profile`) — Shows Tapestry profile, match history, vibe score, connections, leaderboard position

### 3. Prototype Demo Flow (`/demo`)
Fully scripted, polished walkthrough with mocked data showcasing the complete Tapestry vision:
- **Simulated wallet connect** with instant cross-app identity reveal ("You already have reputation from Zumichat!")
- **Smart matching animation** showing Tapestry social graph finding a relevant match
- **Pre-scripted game** with dramatic 60-second countdown and clue reveals
- **Post-match showcase** — reputation updating across apps, connection created on social graph, agent registry demo
- **Cross-app leaderboard** showing ranks across Find60, Tapestry ecosystem, Solana
- Multiple demo scenarios accessible (human vs human, human vs agent, returning user vs new user)

### 4. Leaderboard (`/leaderboard`)
- Find60 rankings (real data from Tapestry content/likes when available)
- Mocked cross-app Tapestry ecosystem rankings
- Filter by time period, mode, skill level

---

## Core Features

### Tapestry Integration (Real)
- Profile creation via `socialfi` package on wallet connect
- Follow/unfollow other players after matches
- Post match results as Tapestry content
- Like/comment on matches in match history
- Namespace: `find60`

### Tapestry Showcase (Mocked for Demo)
- Cross-app reputation scores pulling from other Tapestry apps
- Vibe score calculation with animated breakdowns
- Agent registry showing available AI agents
- Smart matching using social graph connections
- Portable identity badges

### Game Mechanics
- 60-second countdown timer with visual urgency
- Clue reveal system (details to be defined in next planning session)
- Three modes: multiplayer, vs AI, solo
- Bounty/stakes display (visual only for now)
- Post-match rating system (🔥 Fire / 👍 Good / 😐 Meh)

### Design System
- Clean, modern layout with generous whitespace
- Vibrant gradient accents (Solana purple-to-teal palette)
- Playful micro-animations on interactions (scale, fade, slide)
- Large rounded corners on cards and buttons
- Bold typography for scores and timers
- Dark mode support

---

## Technical Approach
- **`socialfi`** npm package for real Tapestry API calls
- **Solana wallet adapter** for real wallet connection on `/play`
- **Mock data layer** for `/demo` that simulates all Tapestry features
- **React Router** for page-based navigation
- All game state managed client-side
- No backend needed initially (Tapestry IS the backend for social features)

---

## What's NOT in This Plan (Future / Next Session)
- Actual gameplay puzzle design (user will define later)
- Real SOL transactions / bounties
- Real-time websocket multiplayer infrastructure
- On-chain match recording

