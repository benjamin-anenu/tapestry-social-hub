

# Root Cause: Wrong Tapestry API URL in Follow Calls

## The Bug

Both `vibe-verdict/index.ts` (line 106) and `vibe-verdict-poll/index.ts` (line 92) use this URL for Tapestry follow calls:

```
const tapUrl = "https://api.usetapestry.dev/v1";
```

The correct URL (as used in `tapestry-identity/index.ts`) is:

```
const tapUrl = "https://api.usetapestry.dev/api/v1";
```

The missing `/api` segment means every follow request hits a non-existent endpoint and silently fails. `Promise.allSettled` swallows the error, so no crash or log is produced. Followers and following counts never increment on Tapestry, and consequently never show up when the identity card re-fetches them.

## Secondary Issue

The `vibe-bot-verdict/index.ts` function does not make any Tapestry follow call at all when a mutual vibe happens with the bot. So bot matches never affect follower counts either.

## Fix

Three files need a one-line URL fix each, plus adding follow logic to bot verdict:

| File | Change |
|------|--------|
| `supabase/functions/vibe-verdict/index.ts` | Fix URL: `/v1` to `/api/v1` (line 106) |
| `supabase/functions/vibe-verdict-poll/index.ts` | Fix URL: `/v1` to `/api/v1` (line 92) |
| `supabase/functions/vibe-bot-verdict/index.ts` | Add Tapestry follow calls in the `if (mutual)` block (after friendships insert, before vibe score increment) |

Then redeploy all three edge functions.

