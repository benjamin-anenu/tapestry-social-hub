

## Fix Tapestry API Endpoints to Match Documentation

### Problem
The wallet-based profile search fails because the code uses the wrong URL and HTTP method. The Tapestry documentation clearly states:

- **Base URL**: `https://api.usetapestry.dev/v1/` (not `/api/v1/`)
- **Profile search**: `POST /v1/profiles/search` with `{ walletAddress }` in the request body
- Current code incorrectly uses: `GET /api/v1/search/profiles?walletAddress=...` (a text search endpoint that requires a `query` parameter)

### Changes

**File: `supabase/functions/tapestry-identity/index.ts`**

Three search calls need to be reverted to `POST` requests at the correct URL:

1. **Recovery search (line 84-86)** -- when username "already exists" during creation
2. **Lookup mode (line 123-124)** -- when checking if a wallet already has a profile
3. **Cross-app profiles fetch (line 188-189)** -- fetching profiles after creation

Each changes from:
```text
GET https://api.usetapestry.dev/api/v1/search/profiles?apiKey=...&walletAddress=...
```
To:
```text
POST https://api.usetapestry.dev/v1/profiles/search?apiKey=...&shouldIncludeExternalProfiles=true
Body: { "walletAddress": "...", "limit": 50, "offset": 0 }
```

Additionally, the `findOrCreate` call (line ~69) should also use `/v1/` instead of `/api/v1/` for consistency with the docs -- it may work today by luck but should be corrected.

### Technical Details

- Add a second constant: `const TAPESTRY_BASE = "https://api.usetapestry.dev/v1"` for the correct base URL
- Update `findOrCreate` to use `TAPESTRY_BASE`
- Update all three search calls to use `POST` method with JSON body containing `walletAddress`
- Keep the existing `TAPESTRY_API` constant only if other endpoints still need it, otherwise replace entirely
- Redeploy the edge function and verify with a test call

No frontend changes needed.
