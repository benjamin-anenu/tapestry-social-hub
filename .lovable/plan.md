

## Fix Profile Lookup After Creation

### Problem
After creating a profile, the app cannot find it again because the wallet lookup uses a broken search endpoint (`POST /v1/profiles/search` -- returns 404 every time). This causes the app to show the "create profile" form even though the profile already exists.

### Root Cause
The Tapestry API documentation has conflicting information:
- The **API Reference** says the base URL is `https://api.usetapestry.dev/api/v1` with search at `GET /search/profiles`
- A **tutorial page** incorrectly shows `POST https://api.usetapestry.dev/v1/profiles/search`

The current code uses the tutorial's wrong URL, which returns a 404 HTML error page.

### Solution
Replace all 3 occurrences of the broken `POST /v1/profiles/search` call with the correct API endpoints under the working `/api/v1` base URL.

**File: `supabase/functions/tapestry-identity/index.ts`**

1. **Wallet lookup mode (line 128-135)**: Replace `POST https://api.usetapestry.dev/v1/profiles/search` with `GET ${TAPESTRY_API}/search/profiles?apiKey=...&walletAddress=...&shouldIncludeExternalProfiles=true` using the existing `TAPESTRY_API` constant (`https://api.usetapestry.dev/api/v1`).

2. **Recovery search in create mode (line 84-91)**: Same fix for the recovery fallback when a username "already exists".

3. **Cross-app profiles fetch after create (line 198-205)**: Same fix for the post-creation cross-app profiles lookup.

All three calls change from:
```
POST https://api.usetapestry.dev/v1/profiles/search
Body: { walletAddress }
```
To:
```
GET https://api.usetapestry.dev/api/v1/search/profiles?apiKey=...&walletAddress=...&shouldIncludeExternalProfiles=true
```

This is consistent with the `findOrCreate` endpoint that already works at the same `/api/v1` base URL.

No frontend changes needed.

