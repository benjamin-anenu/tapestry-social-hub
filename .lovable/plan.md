

## Fix 4 Issues: Matching, Chat Sort, Desktop Size + Profile Flow

### 1. New Users Can't Match ("Profile not found")

**Problem**: `vibe-match` throws "Profile not found" if no `profiles` row exists for the wallet.

**Fix** in `supabase/functions/vibe-match/index.ts`: Replace the `throw` on line 36 with auto-creation of a minimal profile row, then prompt user to complete their profile after the session.

```ts
// Instead of: if (!myProfile) throw new Error("Profile not found");
let myProfile = profileData;
if (!myProfile) {
  const { data: newProfile } = await supabase
    .from("profiles")
    .insert({
      wallet_address: walletAddress,
      user_id: crypto.randomUUID(),
      username: walletAddress.slice(0, 8),
      is_online: true,
      last_seen: new Date().toISOString(),
    })
    .select("id, city, country, username")
    .single();
  if (!newProfile) throw new Error("Could not create profile");
  myProfile = newProfile;
}
```

Also remove the city-based matching branches (lines 53-72) and simplify to:
- If user has `country`, try country match first
- Fallback to global
- Then bot fallback

### 2. Chat Messages Sort (Upward Instead of Downward)

**Problem**: `ChatZone.tsx` line 37 sorts `b.time - a.time` (descending = newest at top).

**Fix**: Change to `a.time - b.time` (ascending = newest at bottom, standard chat order).

### 3. Desktop View Too Compact

**Fix** -- apply responsive Tailwind classes:

| File | Change |
|---|---|
| `src/pages/VibeMatch.tsx` line 208 | `max-w-lg` to `max-w-lg lg:max-w-2xl` |
| `src/pages/VibeMatch.tsx` line 239 | `h-[350px]` to `h-[350px] lg:h-[500px]` |
| `src/pages/Play.tsx` line 50 | `max-w-lg` to `max-w-lg lg:max-w-2xl` |
| `src/components/play/MainHub.tsx` line 36 | `max-w-md` to `max-w-md lg:max-w-lg` |
| `src/components/play/IdentityCard.tsx` line 22 | `max-w-sm` to `max-w-sm lg:max-w-md` |
| `src/components/play/CreateTapestryProfile.tsx` line 65 | `max-w-sm` to `max-w-sm lg:max-w-md` |

### 4. Country: Auto-Detect + Remove City

**`src/components/play/CreateTapestryProfile.tsx`**:
- Remove `city` state, city dropdown, and city in the `.update()` call
- Add `useEffect` on mount to fetch country via `https://ipapi.co/json/` and pre-fill the country dropdown
- User can still manually change country from dropdown

**`src/lib/locations.ts`**:
- Remove `CITIES` export (no longer needed)

**`src/components/play/IdentityCard.tsx`**:
- Change line 15 from showing `city` to showing `country` from profile data

**`supabase/functions/vibe-match/index.ts`**:
- Remove all city-based matching logic; keep country-first then global fallback

---

### Files to Modify

| File | Changes |
|---|---|
| `supabase/functions/vibe-match/index.ts` | Auto-create profile; remove city matching; simplify to country then global |
| `src/components/demo/ChatZone.tsx` | Fix sort order to ascending |
| `src/pages/VibeMatch.tsx` | Responsive container and chat height |
| `src/pages/Play.tsx` | Responsive container |
| `src/components/play/CreateTapestryProfile.tsx` | Remove city; add country auto-detect via IP; responsive sizing |
| `src/components/play/IdentityCard.tsx` | Show country instead of city; responsive sizing |
| `src/components/play/MainHub.tsx` | Responsive card sizing |
| `src/lib/locations.ts` | Remove CITIES export |

