

## Fetch Real Cross-App Reputation from Tapestry

### Problem
The demo shows "CROSS-APP REPUTATION" with per-app scores, but the actual `tapestry-identity` edge function only fetches follower/following counts from the `find60` namespace. Tapestry's API supports querying all profiles linked to a wallet across namespaces, which would give real cross-app data.

### Solution
Update the `tapestry-identity` edge function to call Tapestry's `searchProfiles` endpoint with `shouldIncludeExternalProfiles=true`, then return cross-app profile data to the frontend. Update the real Play flow's IdentityCard to display this data.

### Technical Changes

**1. `supabase/functions/tapestry-identity/index.ts`**

After the existing `findOrCreate` call, add a second fetch to get all profiles for the wallet:

```ts
// Fetch cross-app profiles
let crossAppProfiles: Array<{ namespace: string; followers: number; following: number }> = [];
try {
  const searchRes = await fetch(
    `${TAPESTRY_BASE}/profiles/search?apiKey=${TAPESTRY_API_KEY}&shouldIncludeExternalProfiles=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    }
  );
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    // Map each profile to { namespace, followers, following }
    crossAppProfiles = (searchData.profiles || []).map((p: any) => ({
      namespace: p.namespace || "Unknown",
      username: p.username,
      followers: p.socialCounts?.followers ?? 0,
      following: p.socialCounts?.following ?? 0,
    }));
  }
} catch {
  // non-critical
}
```

Return it alongside existing data:
```ts
return new Response(
  JSON.stringify({
    ...profile,
    social: { followers, following },
    crossAppProfiles,
  }),
  ...
);
```

**2. `src/hooks/useTapestryIdentity.ts`**

Add `crossAppProfiles` to the `TapestryProfile` interface:

```ts
export interface TapestryProfile {
  // ...existing fields
  crossAppProfiles?: Array<{
    namespace: string;
    username?: string;
    followers: number;
    following: number;
  }>;
}
```

**3. `src/components/play/IdentityCard.tsx`**

Display cross-app profiles below followers/following if they exist:

- Show each namespace with its follower count as a simple reputation bar
- Only show if `profile.crossAppProfiles` has entries
- Keep the card clean: namespace name + follower count in a compact list

**4. No changes to `DemoWalletConnect.tsx`**

The demo keeps its mock data as-is since it's a demo/walkthrough. The real flow on `/play` will now show actual cross-app data.

### Files to Modify

| File | Change |
|---|---|
| `supabase/functions/tapestry-identity/index.ts` | Add `searchProfiles` call with `shouldIncludeExternalProfiles=true`; return `crossAppProfiles` array |
| `src/hooks/useTapestryIdentity.ts` | Add `crossAppProfiles` to `TapestryProfile` interface |
| `src/components/play/IdentityCard.tsx` | Display cross-app reputation bars when data is available |

### Notes
- The Tapestry `searchProfiles` endpoint may return the Find60 profile too, so we can either include or filter it out
- If a user has no cross-app profiles, the section simply won't render (graceful fallback)
- This is a read-only query, no new permissions or RLS changes needed

