

## Comprehensive Review and Fix Plan

### Critical Bugs Found

**BUG 1: Human-to-human chat is completely broken (HIGHEST PRIORITY)**

The Realtime subscription for human matches fails silently. Here's why:
- `vibe_sessions` has RLS policies that check `auth.uid()` against `profiles.user_id`
- Your users authenticate via Solana wallet, NOT Supabase Auth -- so `auth.uid()` is always null
- This means Realtime never delivers updates because the RLS blocks the subscription
- Evidence: Session `b3e1cd8e` shows user_a sent 2 messages, but user_b never received them because the Realtime channel was blocked by RLS

Fix: The `vibe_sessions` table already has Realtime enabled. We need to add a permissive SELECT RLS policy that allows anon access for Realtime, OR switch to a polling approach like the bot chat uses. The cleanest fix is to route human chat through an edge function (like bot chat) that returns the partner's messages directly, bypassing RLS entirely.

**BUG 2: `is_online` is never set to false**

Both profiles show `is_online: true` permanently. There's no heartbeat, no timeout, no cleanup. This means matchmaking picks "online" users who left hours ago, creating dead sessions like the one above.

Fix: Add a `last_seen` staleness check in `vibe-match` -- only consider users whose `last_seen` is within the last 2 minutes. Add a heartbeat from the frontend that pings every 30 seconds while on the vibe match page.

**BUG 3: Stale active sessions never expire**

Session `b3e1cd8e` is still `active` and blocks future matches between those two users forever. There's no cleanup mechanism.

Fix: In `vibe-match`, expire any sessions older than 3 minutes that are still `active` before matching.

**BUG 4: `increment_vibe_score` RPC doesn't exist**

Both `vibe-verdict` and `vibe-bot-verdict` call `supabase.rpc("increment_vibe_score")` which doesn't exist in the database. This silently fails (wrapped in `Promise.allSettled`).

Fix: Create the database function.

**BUG 5: `conversations` table missing unique constraint**

The `upsert` in both verdict functions uses `onConflict: "participant_a,participant_b"` but there is no unique constraint on those columns. The upsert silently fails or creates duplicates.

Fix: Add a unique constraint via migration.

**BUG 6: Tapestry follow API endpoint may be incorrect**

The vibe-verdict function calls `POST /profiles/{username}/follow` with body `{ targetUsername }`. This needs to be verified against the actual Tapestry API docs.

---

### Amara Language Update

Current Amara uses heavy pidgin English ("Wetin be your own story?", "E be things"). User wants her to speak proper English with a soft Nigerian accent/flavor -- still Nigerian, still discerning, but more elegant.

Changes to `vibe-bot-chat` system prompt:
- Switch from pidgin-heavy to proper English with light Nigerian expressions
- Keep words like "sha", "o", and "abi" but drop heavy pidgin like "wetin", "abeg", "wahala"
- Make her sound educated, warm, slightly teasing -- like a Lekki girl who went to uni abroad
- Same difficulty level (she doesn't vibe with everyone easily)

Changes to `vibe-bot-verdict` system prompt:
- Match the updated voice for verdict feedback

---

### Reputation and Tapestry Integration

Current state: The Tapestry follow API is called on mutual vibes, but:
1. The API endpoint format needs verification
2. Followers/following counts are fetched on profile load but are display-only
3. There's no mechanism to write vibe_score or other reputation back to Tapestry

The simplest approach that works:
- Fix the Tapestry follow API call (verify endpoint)
- On mutual vibe, the follow already happens bidirectionally -- this IS the reputation. More mutual vibes = more followers on Tapestry
- The `crossAppProfiles` already shows cross-app reputation bars on the identity card
- vibe_score in the local DB tracks local reputation

What should NOT be done now:
- Building a custom reputation token or on-chain scoring
- Overcomplicating the Tapestry integration beyond follow/unfollow
- The follow-based reputation is the right model for now

---

### Implementation Steps

**Step 1: Database migration**
- Create `increment_vibe_score` function
- Add unique constraint on `conversations(participant_a, participant_b)`

**Step 2: Fix human-to-human chat (`vibe-match` + `vibe-chat` + `VibeMatch.tsx`)**
- In `vibe-match`: Add `last_seen` freshness check (within 2 minutes) and expire stale active sessions
- In `vibe-chat`: Return the full updated chat_log in the response (like bot chat does)
- In `VibeMatch.tsx`: For human matches, use polling (every 2 seconds) to fetch chat updates via the edge function instead of relying on broken Realtime
- Add a heartbeat that updates `last_seen` every 30 seconds while on the vibe page

**Step 3: Update Amara's voice**
- Rewrite `AMARA_SYSTEM_PROMPT` in `vibe-bot-chat` for softer, proper English with light Nigerian flavor
- Update `VERDICT_SYSTEM_PROMPT` in `vibe-bot-verdict` to match
- Update `AMARA_GREETINGS` in `vibe-match`
- Update fallback responses

**Step 4: Verify and fix Tapestry follow calls**
- Check the Tapestry API endpoint format
- Add error logging to diagnose failures
- Ensure follower counts actually increment after mutual vibes

---

### Technical Details

**Database migration SQL:**
```sql
-- increment_vibe_score function
CREATE OR REPLACE FUNCTION public.increment_vibe_score(profile_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles SET vibe_score = COALESCE(vibe_score, 0) + 1 WHERE id = profile_id;
$$;

-- Unique constraint for conversations upsert
ALTER TABLE conversations ADD CONSTRAINT conversations_participants_unique UNIQUE (participant_a, participant_b);
```

**Human chat polling approach:**
Instead of Realtime (which RLS blocks for wallet-only users), the frontend will poll a new edge function `player-chat` every 2 seconds during the chatting phase. The function returns the latest `chat_log` from the session. This is the same pattern that already works for bot chat.

**Heartbeat:**
A `useEffect` in `VibeMatch.tsx` that calls `supabase.functions.invoke("vibe-match-heartbeat")` every 30 seconds to update `last_seen` and `is_online`. When the user navigates away, mark offline.

**Amara voice sample (new):**
- Old: "Wetin be your own story? E be things o!"
- New: "So tell me something interesting about yourself. I'm curious, but I don't have all day sha."

**Files to modify:**
1. New migration for `increment_vibe_score` + unique constraint
2. `supabase/functions/vibe-match/index.ts` -- staleness check, session cleanup, updated greetings
3. `supabase/functions/vibe-chat/index.ts` -- return full chat_log
4. `supabase/functions/vibe-bot-chat/index.ts` -- new Amara prompt
5. `supabase/functions/vibe-bot-verdict/index.ts` -- updated verdict voice
6. `supabase/functions/vibe-verdict/index.ts` -- fix Tapestry API, add logging
7. `src/pages/VibeMatch.tsx` -- polling for human chat, heartbeat, offline on unmount

