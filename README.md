# Vibe60

**60 seconds. One stranger. Real vibes only.**

Vibe60 is an anonymous vibe-matching social app built on Solana. Connect your wallet, get matched with a stranger (or an AI bot named **Queen Tapestry**), chat for 60 seconds, then decide: **Vibe** or **Nah**. Mutual vibes trigger an on-chain follow via the Tapestry Protocol, revealing full profiles and unlocking direct messaging.

**Live:** [https://vibe60.lovable.app](https://vibe60.lovable.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Animation | Framer Motion |
| Wallet Auth | Solana Wallet Adapter (Phantom, Solflare) |
| Backend | Supabase (Postgres, Edge Functions, Realtime) |
| Identity | Tapestry Protocol (on-chain social graph) |
| PWA | vite-plugin-pwa (offline support, installable) |

---

## Features

- **Wallet-Based Authentication** — No email/password. Connect a Solana wallet (Phantom or Solflare) to create your identity.
- **60-Second Vibe Chat** — Anonymous real-time chat with a matched stranger. Timer-locked: no early exits.
- **AI Bot Fallback** — If no human is available, you're matched with "Queen Tapestry," an AI persona powered by LLM.
- **Mutual Vibe Reveals** — Both players vote Vibe/Nah. Mutual vibes trigger a reciprocal Tapestry follow and unlock full profile details.
- **Friends & DM System** — Post-match connections appear in "My Circle." Continue conversations with direct messages.
- **Tapestry Identity Sync** — Profiles are automatically enriched from the Tapestry Protocol (username, display name, avatar).
- **Self-Healing Profiles** — A 30-second heartbeat detects and backfills missing identity data from Tapestry.
- **Admin Dashboard** — Wallet-gated admin panel for user management, app settings, and moderation.
- **PWA Installable** — Add to home screen on mobile for a native-like experience with offline fallback.
- **Onboarding Flow** — Five-screen swipeable tutorial for first-time users.

---

## Architecture

Vibe60 is a single-page application (SPA) with all business logic handled by 15 Supabase Edge Functions. The frontend communicates exclusively through these functions — no direct database writes from the client.

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│   React SPA (Vite + Tailwind + shadcn/ui)   │
│   Solana Wallet Adapter for auth            │
└────────────────┬────────────────────────────┘
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────┐
│           Supabase Edge Functions            │
│   15 Deno functions handling all logic       │
│   (matchmaking, chat, verdicts, admin)       │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
   Postgres   Tapestry   LLM API
   Database   Protocol   (AI Chat)
```

---

## Edge Functions Reference

| Function | Purpose |
|----------|---------|
| `vibe-match` | Creates a vibe session — finds a waiting partner or matches with AI bot |
| `vibe-match-poll` | Client polls this to check if a partner has joined the session |
| `vibe-match-heartbeat` | 30s heartbeat to keep user online; self-heals missing Tapestry identity |
| `vibe-chat` | Sends and retrieves chat messages during a vibe session |
| `vibe-bot-chat` | Generates AI bot responses (Queen Tapestry) during bot matches |
| `vibe-bot-verdict` | AI bot submits its verdict after the chat ends |
| `vibe-verdict` | Submits a player's Vibe/Nah verdict with optional feedback |
| `vibe-verdict-poll` | Polls for both verdicts to resolve the match outcome |
| `direct-chat` | Sends and retrieves direct messages between friends |
| `player-chat` | Handles in-game chat for the arena mode |
| `matchmaking` | Queue-based matchmaking for the game arena |
| `bot-gameplay` | AI opponent logic for arena bot matches |
| `tapestry-identity` | Creates/updates Tapestry Protocol profiles |
| `admin-api` | Admin operations (user management, app settings) |
| `test-ai` | Development utility to test AI integration |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 (or [Bun](https://bun.sh))
- **Supabase CLI** — for local edge function development
- A **Solana wallet** browser extension (Phantom or Solflare) for testing

### Clone & Install

```bash
git clone https://github.com/your-username/vibe60.git
cd vibe60
npm install
# or
bun install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

Edge functions require these secrets (configured in your Supabase project dashboard under Settings → Edge Functions → Secrets):

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin-level database access |
| `TAPESTRY_API_KEY` | API key from [Tapestry Protocol](https://usetapestry.dev) |
| `LOVABLE_API_KEY` | API key for AI chat (Queen Tapestry bot responses) |

### Run Development Server

```bash
npm run dev
# or
bun run dev
```

The app will be available at `http://localhost:5173`.

---

## Deployment

### Frontend (Vercel — Recommended)

1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set the **Framework Preset** to `Vite`.
4. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
5. Deploy. Vercel will auto-detect the Vite config.

### Frontend (Netlify)

1. Connect your GitHub repo in [Netlify](https://app.netlify.com).
2. Set **Build command** to `npm run build` and **Publish directory** to `dist`.
3. Add the same environment variables.
4. Add a `_redirects` file in `public/` with: `/* /index.html 200` (for SPA routing).

### Frontend (Cloudflare Pages)

1. Connect your repo in [Cloudflare Pages](https://pages.cloudflare.com).
2. Set **Build command** to `npm run build` and **Build output directory** to `dist`.
3. Add environment variables.

### Edge Functions (Supabase)

Edge functions are deployed to your Supabase project. Use the Supabase CLI:

```bash
supabase login
supabase link --project-ref your-project-id
supabase functions deploy
```

This deploys all functions in `supabase/functions/`. Make sure your secrets are configured in the Supabase dashboard.

---

## Database Schema

Key tables in the Postgres database:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (wallet address, username, display name, Tapestry ID, stats, social links) |
| `vibe_sessions` | Active and completed vibe match sessions with chat logs and verdicts |
| `conversations` | Persistent conversation threads between matched users |
| `direct_messages` | Individual messages within conversations |
| `friendships` | Follow/mutual-follow relationships between profiles |
| `games` | Arena game sessions (hunter/hunted mode) |
| `matchmaking_queue` | Real-time matchmaking queue for arena games |
| `puzzle_templates` | User-created puzzle configurations for the arena |
| `admin_wallets` | Authorized admin wallet addresses |
| `app_settings` | Key-value store for application configuration |

---

## Project Structure

```
vibe60/
├── public/                  # Static assets, PWA icons, offline fallback
├── src/
│   ├── assets/              # Onboarding images
│   ├── components/
│   │   ├── demo/            # Demo mode components (chat, timer, puzzles)
│   │   ├── onboarding/      # Swipeable onboarding screens
│   │   ├── play/            # Core gameplay components (lobby, identity, arena)
│   │   ├── pwa/             # PWA install prompt
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # Custom hooks (onboarding, Tapestry identity, mobile detection)
│   ├── integrations/        # Supabase client + auto-generated types
│   ├── lib/                 # Utilities, mock data, location data
│   ├── pages/               # Route-level page components
│   └── providers/           # Solana wallet provider wrapper
├── supabase/
│   ├── functions/           # 15 Deno edge functions
│   └── migrations/          # Database migration files
├── vite.config.ts           # Vite config with PWA plugin
└── tailwind.config.ts       # Tailwind theme customization
```

---

## License

Built for the **Tapestry Hackathon** on Solana.

MIT License — see [LICENSE](LICENSE) for details.

---

## Credits

- [Tapestry Protocol](https://usetapestry.dev) — On-chain social graph
- [Solana](https://solana.com) — Blockchain infrastructure
- [Supabase](https://supabase.com) — Backend-as-a-service
- [shadcn/ui](https://ui.shadcn.com) — UI component library
- [Framer Motion](https://motion.dev) — Animation library
