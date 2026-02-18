

## Admin Portal for Find60

### What You Get

A protected admin dashboard at `/admin` with three sections:

1. **Overview Cards** -- Total registered users, users who have completed vibe sessions, currently active sessions, and current matching mode
2. **User Table** -- Sortable list of all registered (non-bot) users showing username, wallet (truncated), vibe score, last seen, and online status
3. **Matching Mode Control** -- Toggle between three modes:
   - **Auto** (current default): Try human matches first, fall back to Amara bot
   - **Bot Only**: All users match with Amara only
   - **Human Only**: No bot fallback; users wait or see "no one online"

### Security Model

- Admin access is validated **server-side** by checking the connected wallet against an `admin_wallets` table
- No hardcoded wallet addresses in frontend code
- All data queries run through a single `admin-api` edge function using the service role key
- If a non-admin wallet connects, the page shows "Access Denied"
- The `admin_wallets` table has RLS enabled with no public policies -- only accessible via the edge function

### Architecture

```text
[Admin Page]  -->  [admin-api edge function]  -->  [Database]
     |                      |
     |-- sends wallet  --> checks admin_wallets table
     |                      |
     |<-- returns data  <-- queries profiles, vibe_sessions, app_settings
```

### Database Changes (Migration)

1. **`app_settings` table** -- Single-row key-value config store
   - `key` (text, primary key)
   - `value` (text)
   - Seeded with `matching_mode = 'auto'`
   - RLS enabled, no public policies

2. **`admin_wallets` table** -- Authorized admin wallet addresses
   - `wallet_address` (text, primary key)
   - `created_at` (timestamptz)
   - Seeded with your wallet: `46eC9nnfbgqhfF219js3wpHhM28igahTqoYQyumtVLWb`
   - RLS enabled, no public policies

### Edge Function: `admin-api`

Handles all admin operations through a single endpoint:

- **Action: `dashboard`** -- Returns overview stats (total users, vibed users, active sessions, matching mode) and a list of all registered users
- **Action: `set_matching_mode`** -- Updates the matching mode setting to `auto`, `bot_only`, or `human_only`

Validates caller's wallet against `admin_wallets` before any operation. Returns 403 if unauthorized.

### Matching Mode Integration

Update `vibe-match` edge function to read `matching_mode` from `app_settings` before matching:
- `bot_only`: Skip human search entirely, go straight to Amara
- `human_only`: Skip bot fallback, return "no one online" if no humans
- `auto`: Current behavior (humans first, bot fallback)

### Frontend: `src/pages/Admin.tsx`

- Same dark cyberpunk theme as rest of app (grid-bg, scanlines, glow effects, font-display/font-mono)
- On load: sends connected wallet to `admin-api` for validation
- If not admin: shows "Access Denied" with back button
- If no wallet connected: prompts to connect wallet
- Overview cards at top, user table below, settings panel at bottom
- Matching mode uses radio buttons with immediate save

### Files to Create/Modify

1. **New migration** -- Create `app_settings` and `admin_wallets` tables with seeds
2. **New:** `supabase/functions/admin-api/index.ts` -- Admin backend function
3. **New:** `src/pages/Admin.tsx` -- Admin dashboard UI
4. **Edit:** `src/App.tsx` -- Add `/admin` route
5. **Edit:** `supabase/functions/vibe-match/index.ts` -- Read `matching_mode` from `app_settings` before matching
6. **Edit:** `supabase/config.toml` -- Register `admin-api` function

### What's Deferred (Not Now)

- Per-user ban/mute (add when needed)
- Admin audit log of setting changes
- Multi-admin management UI (add admins directly via database for now)
- Analytics charts (start with raw numbers, add Recharts later)
- Detailed vibe session history view

