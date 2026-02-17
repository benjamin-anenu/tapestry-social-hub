
## Fix Nickname Availability Check and Add Validation Rules

### Root Cause

The Tapestry API base URL is wrong. The docs clearly show it should be `https://api.usetapestry.dev/v1` but the code uses `https://api.usetapestry.dev/api/v1`. This causes:
- Username availability checks hit the wrong endpoint, returning unexpected responses (never 404), so every name appears "taken"
- Profile search returns 404, breaking lookup mode

### Changes

#### 1. Fix Tapestry API base URL (edge function)

**File: `supabase/functions/tapestry-identity/index.ts`**

Change `TAPESTRY_API` from `https://api.usetapestry.dev/api/v1` to `https://api.usetapestry.dev/v1`. This single fix applies to all endpoints: findOrCreate, search, profile lookup, followers, and following.

Also improve the username availability check logic to handle edge cases by parsing the response body, not just relying on status codes.

#### 2. Add client-side nickname validation rules

**File: `src/components/play/CreateTapestryProfile.tsx`**

Add input validation before the nickname is sent to the server:
- Minimum 3 characters, maximum 20 characters
- Alphanumeric and underscores only (no spaces or special characters)
- Auto-strip invalid characters as the user types
- Show inline validation messages explaining the rules
- Skip the server availability check until the local format is valid

### Technical Details

| File | Change |
|---|---|
| `supabase/functions/tapestry-identity/index.ts` | Fix `TAPESTRY_API` to `https://api.usetapestry.dev/v1`; improve checkUsername response parsing |
| `src/components/play/CreateTapestryProfile.tsx` | Add regex validation (`/^[a-zA-Z0-9_]+$/`), length limits (3-20), auto-strip invalid chars, inline error messages |
