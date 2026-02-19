

## Fix Multiple Issues: Bot Speed, Leave Button, Layout, Friendships, Phantom

### 1. Instant Bot Match (Skip 20s Wait)

Currently, when no humans are online, the user waits 20 seconds polling before the bot fallback kicks in. The user wants immediate bot chat when clicking "Make a Friend."

**Changes:**
- `supabase/functions/vibe-match/index.ts`: When `matchingMode` is `auto` and no other waiting humans exist, immediately create a bot session instead of creating a `waiting` session. This means the initial `vibe-match` call returns `status: "matched"` with the bot directly -- no polling needed.
- `supabase/functions/vibe-match-poll/index.ts`: Reduce `WAIT_TIMEOUT_MS` from 20s to 5s as a safety fallback for edge cases where the initial match didn't find a bot.
- `src/pages/VibeMatch.tsx`: The client already skips countdown for bots (lines 105-110), so no client changes needed for this.

### 2. Remove Leave Button During Active Vibe Session

The "Leave" button at the bottom of the chat (lines 381-385 in VibeMatch.tsx) should be removed entirely during the chatting phase. Users should not be able to abandon an active session.

**Change in `src/pages/VibeMatch.tsx`:**
- Delete lines 381-385 (the Leave button rendered during chatting phase).

### 3. Fix Timer and Chat Layout for Mobile

The timer needs to be truly fixed/pinned to the top of the viewport, and the keyboard should overlay the chat rather than pushing everything up.

**Changes in `src/pages/VibeMatch.tsx`:**
- Move the timer bar outside the scrollable content area. Make it `fixed top-0` with proper z-index so it stays pinned to the screen edge regardless of scroll or keyboard.
- The chat area should sit below the fixed timer with appropriate top padding.
- Use `overflow: hidden` on the outer container to prevent any page scrolling.

**Changes in `src/components/demo/ChatZone.tsx`:**
- The chat container should fill the remaining space below the fixed timer.
- The input area stays at the bottom of this container.
- The message scroll area uses the space between timer and input.

### 4. Fix Missing Friendships (Database + Code)

**Data fix**: Insert the missing friendship rows for users `5665c3a8` and `9988ad09` who had a mutual vibe (session `e46bcb63`) but no friendship was created due to the old race condition.

**Code fix in `supabase/functions/vibe-verdict/index.ts`:**
- After updating the verdict, re-fetch the session to get the latest state (not the stale pre-update data). This prevents the race condition where both users read stale data and both think the other hasn't submitted.

**Code fix in `supabase/functions/vibe-verdict-poll/index.ts`:**
- Add error logging for friendship inserts so failures are visible.
- Use `upsert` instead of `insert` for friendships to handle potential duplicate race conditions.

### 5. Phantom Wallet

Phantom wallet adapter is properly configured and connects fine. The issue is only with the Admin page authorization. The wallet address display was already added to the Access Denied screen in the last change. Once the user provides their Phantom address, it can be added to `admin_wallets`.

No code changes needed for this -- it's a data/authorization issue.

---

### Technical File Changes

| File | Change |
|------|--------|
| `src/pages/VibeMatch.tsx` | Remove Leave button; fix timer to `fixed top-0`; adjust chat layout |
| `src/components/demo/ChatZone.tsx` | Ensure chat fills remaining space below fixed timer |
| `supabase/functions/vibe-match/index.ts` | Instant bot match when no humans available |
| `supabase/functions/vibe-match-poll/index.ts` | Reduce fallback timeout to 5s |
| `supabase/functions/vibe-verdict/index.ts` | Re-fetch session after update to prevent race condition |
| `supabase/functions/vibe-verdict-poll/index.ts` | Use upsert for friendships; add error logging |
| Database (data insert) | Add missing friendship rows for users 5665c3a8 and 9988ad09; add conversation |

