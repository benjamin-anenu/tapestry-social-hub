

## Fix Admin Data Display + User Matching Logic

### Issue 1: Admin Dashboard - Missing Data

**Root causes identified:**

1. **display_name is never saved**: During profile creation in `tapestry-identity`, `display_name` is only set when the user provides extended fields AND a username (line 182: `updateFields.display_name = username`). However, the profile row is often auto-created earlier by `vibe-match` (line 58-68) with just the wallet slice as `username` and no `display_name`. The Tapestry create call then tries to `.update()` on the profile but the condition `if (realName || country || xHandle || instagramHandle || bioText)` at line 171 gates it -- if the user only fills in a nickname and nothing else, `display_name` never gets set.

2. **tapestry_id is never written**: No code anywhere writes the `tapestry_id` column. The Tapestry username is stored in `username` (via the wallet slice auto-create) but the actual Tapestry profile ID is never persisted to the `tapestry_id` column.

3. **First setup data not saving**: The `tapestry-identity` edge function only saves extended fields (real_name, country, etc.) when `username` is provided in the request body (create mode, line 171). But the profile row may have been auto-created by `vibe-match` with a random UUID as `user_id`, and the `.update().eq("wallet_address", walletAddress)` should work. The real issue is the condition at line 171 -- it requires at least one of the optional fields to be truthy. If the user only enters a nickname, the update block is skipped entirely, meaning `display_name` is never set.

**Fixes:**

- **tapestry-identity edge function**: 
  - Always save `display_name = username` and `tapestry_id = username` during create mode (remove the gating condition that requires optional fields)
  - Also update the `username` column to the Tapestry nickname (currently it stays as the wallet slice from auto-creation)
  
- **admin-api edge function**: No changes needed -- it already selects all relevant columns

### Issue 2: User Matching - Two Real Users Never Match

**Root causes identified (critical bugs):**

1. **Race condition -- both users create sessions simultaneously**: When User A calls `vibe-match`, it marks itself online and looks for candidates. If User B calls at the same time, both see each other and BOTH create a new `vibe_sessions` row with each other. This creates duplicate sessions. Worse, the active session filter then excludes them from future matches.

2. **Stale `is_online` flag**: The `is_online` flag and `last_seen` are only updated by the heartbeat (every 30s) and when `vibe-match` is called. But the heartbeat only starts on the VibeMatch page. If a user is on the Play hub page, they're not sending heartbeats, so their `is_online` could be stale/false, making them invisible to the matcher.

3. **Freshness window too tight**: The 2-minute freshness window (`FRESHNESS_WINDOW_MS`) means if a user's `last_seen` is even slightly older than 2 minutes, they won't appear as a candidate. Since heartbeats are 30s apart and the user might navigate to the vibe match page at slightly different times, this window is too restrictive.

4. **No "waiting room" pattern**: The current approach is fire-and-forget -- User A calls `vibe-match`, if no one is found, it falls back to a bot. There's no queuing mechanism where User A waits for a human. Both users must call the function at nearly the same instant, and both must have fresh `last_seen` timestamps.

**Fix -- Implement a proper waiting/polling pattern:**

- **vibe-match edge function**: Instead of immediately falling back to a bot, create a "waiting" session (user_a only, user_b = null). On subsequent calls, first check for any waiting sessions from OTHER users and join those. Add a configurable wait timeout (e.g., 15 seconds of polling) before bot fallback.

- **New vibe-match-poll edge function**: The client polls every 2-3 seconds. The function checks if anyone is waiting, and if so, pairs them. If the user has been waiting longer than 15-20 seconds with no match, then fall back to bot.

- **VibeMatch page**: Update the client to poll `vibe-match-poll` every 2-3 seconds while in "searching" phase, instead of doing a single fire-and-forget call.

- **Increase freshness window** to 5 minutes to be more forgiving.

- **Start heartbeat on Play page** (not just VibeMatch) so users are marked online before they click "Make Friends".

### Technical Details

**Files to modify:**

1. `supabase/functions/tapestry-identity/index.ts`
   - Remove the conditional gate at line 171 -- always update profile fields during create mode
   - Set `display_name`, `tapestry_id`, and proper `username` on the profiles row

2. `supabase/functions/vibe-match/index.ts` -- Major rewrite:
   - Step 1: Mark self online
   - Step 2: Check for existing waiting sessions from other users (where `user_b_id IS NULL` and `status = 'waiting'`)
   - Step 3: If found, join that session (set `user_b_id`, status = 'active'), return matched
   - Step 4: If not found, check for online users and create a session directly  
   - Step 5: If no one online, create a waiting session (`user_b_id = NULL`, status = 'waiting')
   - Step 6: Return `{ status: "waiting", sessionId }` so the client knows to poll

3. **New file: `supabase/functions/vibe-match-poll/index.ts`**
   - Client calls this every 2-3 seconds while waiting
   - Checks if the user's waiting session has been claimed (user_b populated, status = 'active')
   - If waiting too long (>20 seconds), auto-match with bot
   - Returns current status: waiting, matched (with partner info), or bot-matched

4. `src/pages/VibeMatch.tsx`
   - Update matching flow: after initial `vibe-match` call, if status = "waiting", start polling `vibe-match-poll` every 2-3 seconds
   - Show "Searching for players..." UI during polling
   - When matched, transition to chat phase

5. `src/pages/Play.tsx`
   - Start the heartbeat on this page too so users are marked online before entering vibe match

6. `supabase/functions/vibe-match-heartbeat/index.ts`
   - No changes needed

