

# Integrate Wallet, Tapestry, and Real /play Route

## Overview

Transform the `/play` route from a placeholder into a fully functional flow: real Solana wallet connection, Tapestry identity resolution via a backend function, and a live lobby that feeds into matchmaking.

---

## Architecture

```text
User clicks "PLAY FOR REAL"
        |
        v
  [Solana Wallet Adapter]
  Connect Phantom / Solflare
        |
        v
  [Edge Function: tapestry-identity]
  POST wallet address --> Tapestry API (devnet)
  findOrCreate profile, fetch reputation
        |
        v
  [Profile upserted in DB]
  profiles table updated with Tapestry data
        |
        v
  [Play Lobby UI]
  Shows identity card, mode select, "Find Match"
        |
        v
  [Edge Function: matchmaking]
  Inserts into matchmaking_queue
  Listens via Realtime for match
        |
        v
  [Game Screen] (reuses demo components)
```

---

## Step 1: Store the Tapestry API Key

Request the `TAPESTRY_API_KEY` secret. This is needed by the backend function to call Tapestry's API. You will be prompted to enter a key from [app.usetapestry.dev](https://app.usetapestry.dev).

## Step 2: Solana Wallet Provider

**New file: `src/providers/WalletProvider.tsx`**

- Wraps the app in `ConnectionProvider` + `WalletProvider` + `WalletModalProvider` from `@solana/wallet-adapter-react-ui`
- Configured for **devnet** (`clusterApiUrl('devnet')`)
- Includes Phantom and Solflare wallet adapters
- Import the default wallet adapter CSS

**Update: `src/App.tsx`**

- Wrap the entire app with `<WalletProviderWrapper>` so wallet state is available on all routes

## Step 3: Tapestry Identity Edge Function

**New file: `supabase/functions/tapestry-identity/index.ts`**

- Accepts `POST { walletAddress: string }`
- Calls Tapestry devnet API: `https://api.dev.usetapestry.dev/v1/profiles/findOrCreate`
  - Uses the `TAPESTRY_API_KEY` secret
  - Namespace: `find60`
  - Blockchain: `SOLANA`
  - Execution: `FAST_UNCONFIRMED`
- If the profile exists, also fetches followers/following count for reputation display
- Returns the Tapestry profile data (username, bio, image, social connections)

## Step 4: Tapestry Hook

**New file: `src/hooks/useTapestryIdentity.ts`**

- Custom React hook that takes a `walletAddress` (from the wallet adapter)
- Calls the `tapestry-identity` edge function via `supabase.functions.invoke()`
- Returns `{ profile, isLoading, error }`
- On successful response, upserts the profile into the `profiles` table with the Tapestry data

## Step 5: Rebuild /play Page

**Rewrite: `src/pages/Play.tsx`**

Three-phase flow within the page:

### Phase 1: Connect Wallet
- Uses `useWallet()` from the adapter
- Shows the standard "Connect Wallet" button (Phantom/Solflare auto-detected)
- Animated with the existing cyberpunk styling
- On connect, auto-advances to Phase 2

### Phase 2: Identity Reveal
- Calls `useTapestryIdentity(walletAddress)`
- Shows loading state ("Scanning Tapestry graph...")
- Reveals the profile card with real data: username, avatar, vibe score
- If no Tapestry profile exists, prompts to create one (username input)
- Shows "Enter the Arena" button

### Phase 3: Lobby
- Mode select (Hunter / Hunted / Duel) -- reuses styling from demo
- Bounty stake input (0.01 - 1.0 SOL, devnet tokens)
- "Find Match" button that:
  - Inserts into `matchmaking_queue` via an edge function
  - Subscribes to Realtime channel for match updates
  - Shows searching animation with player count
- On match found, navigates to game screen (future step -- for now shows "Match found!" with opponent card)

## Step 6: Matchmaking Edge Function

**New file: `supabase/functions/matchmaking/index.ts`**

- `POST { profileId, role, stakeAmount }`
- Inserts player into `matchmaking_queue`
- Checks for compatible opponent (opposite role, similar vibe score range)
- If match found: creates a `games` row, updates both queue entries to `matched`, returns game ID
- If no match: returns `{ status: "waiting" }` -- client listens via Realtime for updates

## Step 7: Profile Creation Flow

**New file: `src/components/play/CreateTapestryProfile.tsx`**

- Shown when a connected wallet has no Tapestry profile
- Username input with availability check (calls Tapestry API)
- Optional bio field
- "Create Profile" button calls the edge function to create on Tapestry

## New/Updated Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/providers/WalletProvider.tsx` | Create | Solana wallet adapter wrapper |
| `src/App.tsx` | Update | Wrap with wallet provider |
| `supabase/functions/tapestry-identity/index.ts` | Create | Tapestry API proxy |
| `supabase/functions/matchmaking/index.ts` | Create | Queue + match logic |
| `src/hooks/useTapestryIdentity.ts` | Create | Wallet-to-identity hook |
| `src/pages/Play.tsx` | Rewrite | 3-phase real play flow |
| `src/components/play/CreateTapestryProfile.tsx` | Create | New profile onboarding |
| `src/components/play/PlayLobby.tsx` | Create | Mode select + matchmaking UI |
| `src/components/play/IdentityCard.tsx` | Create | Real identity display card |

---

## Technical Notes

- The `socialfi` npm package is designed for Node.js/server environments. Since we are in a browser context, the edge functions will call the Tapestry REST API directly using `fetch` instead of the SDK. This avoids bundling issues.
- Wallet adapter CSS will be imported in the provider file (`@solana/wallet-adapter-react-ui/styles.css`).
- All Tapestry API calls go through edge functions to keep the API key server-side.
- The Tapestry devnet URL is `https://api.dev.usetapestry.dev/v1/`.
- The app namespace on Tapestry will be `find60`.

