

## Fix: Tapestry Profile Lookup and Creation Flow

### Problems Identified

1. **Search endpoint 404**: The `/v1/profiles/search` endpoint is returning 404. The Tapestry docs show both `/v1/` and `/api/v1/` base URLs -- the search endpoint likely needs to use `/api/v1/` like the other endpoints.

2. **Namespace mismatch**: The wallet's Tapestry profile exists under the `"find"` namespace, but the lookup code filters for `"find60"`. This means even a working search would never match the profile.

3. **Post-creation refresh fails**: After creating a profile, the refresh hook calls lookup mode, which fails due to issues 1 and 2 above, causing the Create Identity form to reappear in a loop.

### Fix Plan

#### Part 1: Fix the search endpoint URL

**File: `supabase/functions/tapestry-identity/index.ts`**

Remove the separate `TAPESTRY_V1` constant. Use a single base URL (`https://api.usetapestry.dev/api/v1`) for ALL Tapestry API calls, including search. The search endpoint should be at `api/v1/profiles/search`, matching the other working endpoints.

#### Part 2: Fix namespace filtering

**File: `supabase/functions/tapestry-identity/index.ts`**

- Change the `findOrCreate` namespace from `find60` to `find` (or whichever namespace your app actually uses)
- Change the lookup filter from `p.namespace === "find60"` to `p.namespace === "find"`
- Update follower/following endpoints to use `namespace=find`

#### Part 3: Improve post-creation flow

**File: `src/pages/Play.tsx`**

Instead of relying on a second lookup call after creation, pass the create response directly as the active profile. The create call already returns the full profile data -- no need for a separate refresh that can fail.

### Technical Details

| File | Changes |
|---|---|
| `supabase/functions/tapestry-identity/index.ts` | Use single `TAPESTRY_API` base URL for all calls; fix namespace from `find60` to `find` |
| `src/pages/Play.tsx` | Store create response directly as profile instead of triggering a refresh lookup |
| `src/components/play/CreateTapestryProfile.tsx` | Pass created profile data back via `onCreated` callback |

### What This Achieves

- Wallet connects -> search finds existing "Sensei" profile -> IdentityCard shown
- New wallet -> search returns empty -> Create Identity form shown
- User creates profile -> response stored directly -> IdentityCard shown immediately (no fragile refresh)

