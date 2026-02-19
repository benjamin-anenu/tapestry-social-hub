
## Fix Build Error + Display Names + Chat/Keyboard Experience

### What's Actually Happening

**From the database**, real user profiles have:
- `display_name = null` (never set)
- `username = "QyLSSxn7"` (short wallet-derived Tapestry username)

So "QyLSSxn7" IS the Tapestry username — it's not a wallet address, but it looks like one. The `display_name` field is simply never being written for real users.

**Two fixes needed:**
1. The search filter in Friends.tsx has the priority reversed: it searches `c.username ?? c.displayName` but should be `c.displayName ?? c.username`
2. Real users' display names need to be resolved better — either from Tapestry's `username` field (which IS their chosen nickname) or we need a fallback label

### Root Cause of Build Error

The build error is almost certainly a TypeScript issue. The `direct-chat/index.ts` edge function references `supabase.rpc("is_mutual_friend", ...)` with typed params that Deno might be rejecting. But since edge functions don't fail the React build, the build error is likely a **JSX/TypeScript error in a React file** — likely introduced during Friends.tsx or FriendChat.tsx edits (possibly an unclosed tag or type mismatch).

### Fix Plan

**1. Friends.tsx — Fix search filter priority + display name fallback**
- Line 22: `convo.displayName ?? convo.username` is already correct (displayName first)
- Line 138 (search filter): Fix `c.username ?? c.displayName` → `c.displayName ?? c.username`
- Add a helper to make names look better: if `displayName` is null and `username` looks like a wallet short string (8 chars, alphanumeric), show it as-is but style it as a username

**2. FriendChat.tsx — Already correct at line 220**
- `friend?.displayName ?? friend?.username ?? "Chat"` — this is correct, no change needed

**3. Fix the display name issue at source (tapestry-identity edge function)**
- Currently `display_name` is set from Tapestry's `displayName` field
- For users who don't set a display name on Tapestry, it falls back to null
- Fix: When creating/finding a profile, set `display_name = username` if `display_name` is null. This ensures the circle always shows a recognizable name instead of null

**4. Fix search filter in Friends.tsx**
- Line 138: Reverse priority so search checks displayName first

**5. Keyboard/Chat UX fix in FriendChat.tsx**
- The chat input uses `h-[100dvh]` layout which should handle keyboards, but on mobile the keyboard pushing the layout needs `pb-safe` handling
- Add `viewport-fit=cover` safe area handling to the input bar
- The input bar `p-3` should have `pb-safe` or use `env(safe-area-inset-bottom)` for iPhone notch handling

### Files to Change

| File | Change |
|------|--------|
| `src/pages/Friends.tsx` | Fix search filter priority (line 138) |
| `src/pages/FriendChat.tsx` | Add safe-area padding for keyboard on mobile, fix any build error |
| `supabase/functions/tapestry-identity/index.ts` | Set `display_name = username` as fallback when display_name is null on upsert |

### Database Fix (display_name for existing users)
Run an SQL update to backfill display_name from username for users where display_name is null:
```sql
UPDATE profiles 
SET display_name = username 
WHERE display_name IS NULL AND is_bot = false AND username IS NOT NULL;
```
This will make "QyLSSxn7" show as the display name until users set a proper one — which is better than showing nothing or a full wallet address. Future logins will automatically set display_name from username.

### Technical Implementation Order
1. Run DB backfill migration for display_name
2. Fix Friends.tsx search filter
3. Fix FriendChat.tsx mobile keyboard safe area
4. Update tapestry-identity edge function to always set display_name fallback
