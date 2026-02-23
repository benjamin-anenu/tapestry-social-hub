
# Plan: Professional README + UX Bug Audit

## Part 1: Rewrite README.md

Replace the auto-generated Lovable boilerplate with a professional, developer-facing README that documents the project properly. The new README will include:

### Structure
1. **Project Title and Description** -- Vibe60: a 60-second anonymous vibe-matching social app on Solana, built for the Tapestry Hackathon
2. **Live URL** -- https://vibe60.lovable.app
3. **Tech Stack** -- React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Solana Wallet Adapter, Supabase (backend + edge functions), Tapestry Protocol, PWA (vite-plugin-pwa)
4. **Features Overview** -- Wallet-based auth, 60s vibe chat (human or AI bot "Queen Tapestry"), mutual vibe reveals with on-chain Tapestry follows, friends/DM system, admin dashboard, PWA installable
5. **Architecture** -- Frontend SPA with 15 Supabase Edge Functions handling matchmaking, chat, verdicts, identity sync, admin operations
6. **Edge Functions Reference** -- Table listing each function and its purpose
7. **Getting Started (Local Development)** -- Clone, install (npm/bun), set up environment variables, run dev server
8. **Environment Variables** -- Document required `.env` vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) and edge function secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TAPESTRY_API_KEY`, `LOVABLE_API_KEY`)
9. **Deployment** -- Instructions for Vercel (recommended), Netlify, and Cloudflare Pages as standard hosting platforms. Note that edge functions require a Supabase project
10. **Database** -- Mention key tables (profiles, vibe_sessions, conversations, direct_messages, admin_wallets, app_settings, games, matchmaking_queue)
11. **Project Structure** -- Brief directory tree overview
12. **License / Credits** -- Tapestry Hackathon, Solana

### What will NOT be in the README
- No Lovable-specific instructions or URLs
- No "REPLACE_WITH_PROJECT_ID" placeholders
- No mention of Lovable subscriptions or deployment via Lovable

---

## Part 2: UX Loopholes / Bugs Identified

After reviewing the codebase, here are potential issues:

### 1. No wallet guard on VibeMatch page (Medium severity)
**File:** `src/pages/VibeMatch.tsx` (line 25)
**Issue:** If a user navigates directly to `/play/vibe` without connecting a wallet, `walletAddress` is `null`. The `findMatch` effect (line 99) has a guard `if (!walletAddress) return`, so the page just shows the "searching" spinner forever with no way to connect or go back easily.
**Fix:** Add a wallet check at the top of the component -- if no wallet is connected, redirect to `/play` or show a "Connect Wallet" prompt.

### 2. No wallet guard on Friends page (Medium severity)
**File:** `src/pages/Friends.tsx` (line 68)
**Issue:** Same problem -- navigating to `/play/friends` without a wallet shows an empty loading state forever.
**Fix:** Redirect to `/play` if wallet not connected.

### 3. VibeMatch timer starts immediately for bot matches, ignoring chat_starts_at (Low severity)
**File:** `src/pages/VibeMatch.tsx` (lines 114-119)
**Issue:** For bot matches, the phase jumps directly to "chatting" (skipping countdown). The 60s GameTimer starts immediately. This is intentional but worth noting -- bot matches feel instant vs. human matches which get a 3-2-1-GO countdown.

### 4. Verdict double-submit protection relies on ref only (Low severity)
**File:** `src/pages/VibeMatch.tsx` (line 237)
**Issue:** `submittingVerdict.current` prevents double submission, but if the API call fails (line 257-259), the ref is reset to `false`, allowing a retry. This is actually correct behavior. No bug here.

### 5. Session expiry race condition in vibe-match (Low severity)
**File:** `supabase/functions/vibe-match/index.ts` (lines 99-103)
**Issue:** `SESSION_EXPIRY_MS` is 3 minutes, but the polling interval on the client is 2.5 seconds. A waiting session could be expired server-side while the client is still polling, causing the poll to return "expired" status. This is handled correctly (line 167-168 shows "Session expired -- try again!"). No actual bug, just a slightly aggressive 3-minute timeout.

### 6. Heartbeat runs on BOTH Play.tsx and VibeMatch.tsx (Low severity)
**File:** `src/pages/Play.tsx` (lines 37-56) and `src/pages/VibeMatch.tsx` (lines 54-65)
**Issue:** Both pages run independent 30s heartbeat intervals. When navigating from Play to VibeMatch, there's a brief overlap where two heartbeats fire. The old one cleans up via the effect return, but there's a small window of double-firing. Not a functional bug, just redundant API calls.

### 7. No back button or escape during VibeMatch chatting phase (UX concern)
**File:** `src/pages/VibeMatch.tsx` (lines 316-361)
**Issue:** Once in the "chatting" phase, the user has no way to leave until the 60s timer expires. This is by design (preventing early exits to ensure fair matches), but there's no visible indication to the user that they must wait. If the app is buggy or the partner is unresponsive, the user is trapped for 60 seconds.

### 8. Onboarding stored in localStorage only (Low severity)
**File:** `src/hooks/useOnboarding.ts`
**Issue:** Onboarding completion is stored in `localStorage`. Clearing browser data or using a new device forces re-onboarding. This is acceptable for a hackathon project but worth noting.

---

## Technical Details

### Files to Change
| File | Change |
|------|--------|
| `README.md` | Complete rewrite with professional documentation |
| `src/pages/VibeMatch.tsx` | Add wallet guard -- redirect to `/play` if no wallet |
| `src/pages/Friends.tsx` | Add wallet guard -- redirect to `/play` if no wallet |

### Wallet Guard Implementation
Both `VibeMatch.tsx` and `Friends.tsx` will add an early check:

```typescript
// At the top of the component, after wallet hooks
if (!connected) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <p className="font-mono text-sm text-muted-foreground">
          Connect your wallet first to access this page.
        </p>
        <Button onClick={() => navigate("/play")}>
          Connect Wallet
        </Button>
      </div>
    </div>
  );
}
```
