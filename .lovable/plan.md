

## Rebrand Find60 to Vibe60 + Fix Missing Profile Data

### Part 1: Rebrand to Vibe60

All references to "Find60" / "FIND" / "find60" will be updated to "Vibe60" / "VIBE" / "vibe60" across the platform, **excluding the demo area** (Demo.tsx and all src/components/demo/* files).

**Files to update:**

| File | What changes |
|------|-------------|
| `src/pages/Index.tsx` | "FIND" -> "VIBE", "Find your people" -> "Vibe with your people", "Find60" references |
| `src/pages/Leaderboard.tsx` | "Find60" -> "Vibe60" in description |
| `src/pages/Admin.tsx` | "Find Score" label -> "Vibe Score" (display label only) |
| `src/components/play/IdentityCard.tsx` | Filter namespace from `"find60"` to `"vibe60"` |
| `src/index.css` | Comment "Find60 Dark-first brand" -> "Vibe60 Dark-first brand" |
| `src/lib/mock-data.ts` | "Find60" -> "Vibe60" in MOCK_REPUTATION |
| `src/components/play/PlayLobby.tsx` | "Find Match" button text -> "Find Vibe" or "Start Vibe" |
| `index.html` | Page title updated to "Vibe60" |
| `supabase/functions/tapestry-identity/index.ts` | NAMESPACE `"find"` -> `"vibe"` |
| `supabase/functions/bot-gameplay/index.ts` | "Find60" -> "Vibe60" in system prompt |
| `supabase/functions/player-chat/index.ts` | "Find60" -> "Vibe60" in system prompt |

**Not changed:** `src/pages/Demo.tsx`, `src/components/demo/*` -- left as-is per your request.

**Note on Tapestry namespace:** Changing from `"find"` to `"vibe"` means new profiles will be created under the new namespace. Existing profiles created under `"find"` will no longer be auto-detected on login. If you want existing users to keep working, we can keep the namespace as `"find"` internally and only change the display name. Let me know if that matters, otherwise I'll change it.

---

### Part 2: Fix Missing Profile Fields (display_name, real_name, country, city, etc.)

**Root cause:** When a user creates their profile in `CreateTapestryProfile.tsx`, the component tries to save extended fields (real_name, country, x_handle, instagram_handle, bio_text) by calling `supabase.from("profiles").update(...)` directly from the browser. However, the RLS policy on `profiles` requires `auth.uid() = user_id` for updates. Since users authenticate via Solana wallet (not email/password), there is no active auth session, so the update **silently fails** -- the data is never saved.

**Fix:** Move the profile field update into the `tapestry-identity` edge function, which runs with the service role key (bypasses RLS). The frontend will pass the extra fields (real_name, country, x_handle, instagram_handle, bio_text) to the edge function during profile creation, and the function will update the `profiles` table server-side.

**Changes:**

1. **`supabase/functions/tapestry-identity/index.ts`**
   - Accept new optional fields in the request body: `realName`, `country`, `xHandle`, `instagramHandle`, `bioText`
   - After creating the Tapestry profile, use the service-role Supabase client to update the `profiles` row with these fields
   - This guarantees the data is saved regardless of RLS

2. **`src/components/play/CreateTapestryProfile.tsx`**
   - Pass the extra fields to the edge function call instead of updating profiles directly from the client
   - Remove the client-side `supabase.from("profiles").update(...)` call since it never worked anyway

---

### Technical Details

**tapestry-identity edge function changes:**
- Import and create a Supabase service-role client
- In the create-mode branch, after successfully creating the Tapestry profile, run:
  ```
  supabase.from("profiles").update({
    real_name, country, x_handle, instagram_handle, bio_text, display_name
  }).eq("wallet_address", walletAddress)
  ```
- This uses the service role key so RLS is bypassed

**CreateTapestryProfile.tsx changes:**
- Send `{ walletAddress, username, bio, realName, country, xHandle, instagramHandle }` to the edge function
- Remove the separate `.update()` call after `onCreated(data)`

**city field:** The `city` column exists in the database but the create profile form doesn't have a city input field. This is why city is always null. Adding a city input is optional -- can be added later if desired.

