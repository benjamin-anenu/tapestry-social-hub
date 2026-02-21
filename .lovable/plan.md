

## Fix: Sync Full Tapestry Identity Immediately After Wallet Connection

### Problem
When a wallet connects, profiles are created with `username: walletAddress.slice(0, 8)` and all other fields (`display_name`, `country`, `x_handle`, `instagram_handle`, `bio_text`, `tapestry_id`) remain empty. The Tapestry lookup only happens if the user navigates to the identity phase on the Play page. Users who go straight to Vibe Match or get matched before completing profile setup show up with wallet prefixes instead of real names.

### Solution
Two complementary fixes that ensure identity data is populated as early as possible:

**1. Enrich new profiles in `vibe-match` immediately after creation**

When `vibe-match/index.ts` creates a new profile (lines 115-128), it will immediately call the Tapestry wallet lookup API to fetch the real username, display_name, and tapestry_id. This covers the "first touch" scenario where a wallet has never been seen before.

**2. Add self-healing sync to `vibe-match-heartbeat`**

Since the heartbeat fires every 30 seconds on the Play page, it is the perfect place to detect and fix incomplete profiles. After updating `is_online`/`last_seen`, the heartbeat will:
- Check if the profile has `tapestry_id IS NULL`
- If so, call the Tapestry wallet lookup API
- Sync `display_name`, `username`, and `tapestry_id` from Tapestry
- This ensures any profile that slipped through without identity data gets fixed within 30 seconds

### What About Country, Social Links, Bio?
These fields (`country`, `real_name`, `x_handle`, `instagram_handle`, `bio_text`) are **user-submitted** data — they are entered by the user during profile creation or via the Edit Profile sheet. They are NOT available from the Tapestry API. The existing `tapestry-identity` edge function already stores them correctly when the user submits them.

The Tapestry API only provides: `username`, `bio`, `image`, `followers/following counts`, and `cross-app profiles`. So the sync will pull everything that Tapestry knows about, which is the identity fields (`username` / `display_name` / `tapestry_id`).

The user-submitted fields will continue to populate when the user fills them in via the Create Profile or Edit Profile forms — that flow already works correctly and stores to the database.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/vibe-match/index.ts` | After inserting a new profile (line 115-128), add Tapestry wallet lookup to sync `display_name`, `username`, `tapestry_id` |
| `supabase/functions/vibe-match-heartbeat/index.ts` | After `is_online`/`last_seen` update, check if `tapestry_id` is null and if so, call Tapestry API to sync identity fields |

### Technical Details

**`vibe-match/index.ts` — after line 127:**
```typescript
// Immediately try to sync Tapestry identity for the new profile
try {
  const tapestryApiKey = Deno.env.get("TAPESTRY_API_KEY");
  if (tapestryApiKey) {
    const res = await fetch(
      `https://api.usetapestry.dev/api/v1/identities/${encodeURIComponent(walletAddress)}/profiles?apiKey=${tapestryApiKey}`
    );
    if (res.ok) {
      const data = await res.json();
      const profiles = data.profiles || data || [];
      const list = Array.isArray(profiles) ? profiles : [];
      const vibeProfile = list.find(p => {
        const ns = typeof p.namespace === "string" ? p.namespace : p.namespace?.name;
        return ns === "vibe" || ns === "find";
      });
      if (vibeProfile) {
        const uname = vibeProfile.username || vibeProfile.id;
        if (uname) {
          await supabase.from("profiles").update({
            display_name: uname,
            username: uname,
            tapestry_id: uname,
          }).eq("id", newProfile.id);
        }
      }
    }
  }
} catch (e) {
  console.warn("Tapestry sync on create failed (non-blocking):", e);
}
```

**`vibe-match-heartbeat/index.ts` — after the `is_online`/`last_seen` update:**
```typescript
// Self-healing: sync Tapestry identity if tapestry_id is missing
const { data: prof } = await supabase
  .from("profiles")
  .select("id, tapestry_id")
  .eq("wallet_address", walletAddress)
  .single();

if (prof && !prof.tapestry_id) {
  try {
    const tapestryApiKey = Deno.env.get("TAPESTRY_API_KEY");
    if (tapestryApiKey) {
      const res = await fetch(
        `https://api.usetapestry.dev/api/v1/identities/${encodeURIComponent(walletAddress)}/profiles?apiKey=${tapestryApiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const profiles = data.profiles || data || [];
        const list = Array.isArray(profiles) ? profiles : [];
        const vibeProfile = list.find(p => {
          const ns = typeof p.namespace === "string" ? p.namespace : p.namespace?.name;
          return ns === "vibe" || ns === "find";
        });
        if (vibeProfile) {
          const uname = vibeProfile.username || vibeProfile.id;
          if (uname) {
            await supabase.from("profiles").update({
              display_name: uname,
              username: uname,
              tapestry_id: uname,
            }).eq("id", prof.id);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Heartbeat Tapestry sync failed (non-blocking):", e);
  }
}
```

Both syncs are non-blocking — if Tapestry is down or the wallet has no profile yet, everything continues to work with the wallet prefix as a fallback.
