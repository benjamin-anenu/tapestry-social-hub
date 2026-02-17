

## Fix: Separate Profile Lookup from Creation

### Root Cause

The `tapestry-identity` edge function uses Tapestry's `findOrCreate` endpoint for EVERY call -- including the initial identity check when a wallet connects. This means the first time a new wallet connects, it immediately auto-creates a profile with a generic username like `find60_abcd1234`, and the `CreateTapestryProfile` form is never shown because `hasProfile` evaluates to `true`.

### About Clearing Data

- **Local database**: We can delete all non-bot profiles from the `profiles` table. This is safe and reversible.
- **Tapestry**: Profiles created on Tapestry are permanent. They cannot be deleted. However, the fix below ensures Tapestry profiles are only created when the user explicitly submits the form with their chosen nickname -- so clearing local data + deploying the fix will give you a clean slate for new wallets.
- **Existing generic profiles**: Wallets that already have a `find60_XXXXX` profile on Tapestry will still show as "having a profile." For a true fresh start, use a different wallet.

### The Fix (2 parts)

#### Part 1: Split the edge function into lookup vs. create modes

**File: `supabase/functions/tapestry-identity/index.ts`**

Add a `mode` parameter to the request body:
- `mode: "lookup"` (default when no username provided) -- Uses Tapestry's `profiles/search` endpoint to check if a profile exists for this wallet, without creating one. Returns the profile if found, or `{ profile: null }` if not.
- `mode: "create"` (when username is provided) -- Uses the existing `findOrCreate` endpoint to create the profile with the user's chosen nickname.

```
// Pseudocode for the new logic:
if (username) {
  // CREATE mode: use findOrCreate as before
} else {
  // LOOKUP mode: use profiles/search to find existing profile
  // If no profile found in find60 namespace, return { profile: null }
}
```

#### Part 2: Update the frontend check

**File: `src/pages/Play.tsx`**

Update the `hasProfile` check. Currently it checks `activeProfile?.profile?.username || activeProfile?.username`. After the fix, when no Tapestry profile exists, the edge function returns `{ profile: null }`, so `hasProfile` will correctly be `false` and the `CreateTapestryProfile` form will be shown.

No changes needed to `CreateTapestryProfile.tsx` -- it already passes `username` when calling `tapestry-identity`, which will trigger create mode.

#### Part 3: Clear existing test profiles

Run a SQL query to delete all non-bot profiles from the database so you can test fresh:

```sql
DELETE FROM profiles WHERE is_bot = false;
```

### Files to Modify

| File | Change |
|---|---|
| `supabase/functions/tapestry-identity/index.ts` | Split into lookup (search) vs. create (findOrCreate) modes based on whether `username` is provided |
| `src/pages/Play.tsx` | Minor adjustment to `hasProfile` check to handle `{ profile: null }` response |

### What This Achieves

1. New wallet connects -- edge function does a search-only lookup -- no Tapestry profile found -- `CreateTapestryProfile` form is shown
2. User fills in nickname, real name, socials -- submits -- edge function creates profile on Tapestry with chosen nickname
3. Existing wallets with Tapestry profiles -- search finds them -- `IdentityCard` is shown as before
4. Cross-app reputation data still fetched in both modes

