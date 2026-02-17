

## Fix Nickname Availability Check and Profile Search

### Root Cause

Two separate Tapestry API issues are causing all nicknames to appear "taken":

1. **Username availability check (403 error)**: The `GET /profiles/{username}` endpoint returns a 403 when using the `namespace=find` query parameter because the API key restricts namespace filtering to "nemoapp" only. Since the check falls into the "unexpected error" branch, it defaults to `available: false` for every username.

2. **Profile search (404 error)**: The `POST /profiles/search` endpoint does not exist at `/api/v1` -- it lives at `/v1`. This breaks wallet lookup mode.

Meanwhile, `POST /profiles/findOrCreate` works correctly at `/api/v1`. The Tapestry API uses different base paths for different endpoints.

### Changes

**File: `supabase/functions/tapestry-identity/index.ts`**

1. **Fix username availability check**: Remove the `&namespace=find` parameter from the `GET /profiles/{username}` URL. Usernames are unique across Tapestry, so namespace filtering is unnecessary and causes the 403 error.

2. **Fix profile search endpoint**: Change the search URL from `${TAPESTRY_API}/profiles/search` to `https://api.usetapestry.dev/v1/profiles/search` (use `/v1` base for this specific endpoint). This applies to all three places the search endpoint is called (lookup mode and cross-app profile fetches).

3. **Fix followers/following endpoints**: Similarly remove the `namespace` parameter from the followers/following GET endpoints to avoid the same 403 restriction.

No frontend changes needed -- the `CreateTapestryProfile.tsx` component already has proper validation and status indicators.

### Technical Details

| Endpoint | Current (broken) | Fixed |
|---|---|---|
| Check username | `GET /api/v1/profiles/{name}?apiKey=...&namespace=find` (403) | `GET /api/v1/profiles/{name}?apiKey=...` (no namespace) |
| Profile search | `POST /api/v1/profiles/search` (404) | `POST /v1/profiles/search` |
| Followers | `GET /api/v1/profiles/{name}/followers?...&namespace=find` (403) | `GET /api/v1/profiles/{name}/followers?apiKey=...` (no namespace) |
| Following | `GET /api/v1/profiles/{name}/following?...&namespace=find` (403) | `GET /api/v1/profiles/{name}/following?apiKey=...` (no namespace) |
| findOrCreate | `POST /api/v1/profiles/findOrCreate?...&namespace=find` | No change (already works) |

