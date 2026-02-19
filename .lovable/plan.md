
## Fix Queen Tapestry AI Replies + Admin Bot Configuration + Display Name Resolution

### Advisory Council Assessment

**The core problem, reframed:**
Three distinct failure modes are occurring simultaneously:

1. **AI Gateway 500 errors** — The `google/gemini-2.5-flash` model is returning HTTP 500 on every call to the Lovable AI Gateway, triggering the hardcoded catch fallback. This is the sole reason Queen Tapestry says *"Hey! Sorry, got distracted for a sec."* — it's not a prompt issue, it's a model availability/call issue.

2. **Display names showing Tapestry short codes** — Users like "QyLSSxn7" have their 8-character Tapestry username as their `display_name` (correctly backfilled). This IS the correct name from the Tapestry namespace — it's just cryptic. The UI code is working correctly; the underlying data is just opaque handles. This needs a better labeling strategy, not a code fix.

3. **No admin control over Queen Tapestry's persona** — The prompt is hardcoded in two separate edge functions with no runtime configurability, violating the principle of operational separation between code and configuration.

---

### Issue 1: Fix the AI Gateway Call

**Root cause confirmed from logs:**
```
AI error: 500 {"type":"internal_server_error","message":"","details":""}
```
This is happening on every single call. The model `google/gemini-2.5-flash` is consistently failing. Switch to `google/gemini-3-flash-preview` (the recommended default) in both `direct-chat` and `vibe-bot-chat`. Also add a retry with a fallback model (`google/gemini-2.5-flash-lite`) before giving up with a hardcoded string.

**Files affected:**
- `supabase/functions/direct-chat/index.ts` — switch model, add retry
- `supabase/functions/vibe-bot-chat/index.ts` — switch model, add retry

---

### Issue 2: Display Name Clarity

**The data is correct.** The DB shows `display_name = "QyLSSxn7"` — this is their chosen Tapestry username, not a wallet address (the wallet is `QyLSSxn7pbLo8cTbpZmNimmCk8Qf1M4EEUptwb16eun`). The `Friends.tsx` code correctly uses `displayName ?? username`.

**The real problem:** Users never see an opportunity to set a human-readable display name. The Tapestry short handle is being used as-is.

**Fix:** In `Friends.tsx`, if the `displayName` matches the wallet address prefix pattern (short alphanumeric), show it but add a subtle visual indicator. More importantly, ensure the `tapestry-identity` edge function writes proper display names when Tapestry returns a real username vs a wallet-derived one. No UI logic change needed here — the data layer is the right layer to fix this.

The display name "QyLSSxn7" IS their Tapestry identity — this is correct behavior. The issue is cosmetic and the real fix is encouraging users to set a display name via profile edit.

---

### Issue 3: Admin — Queen Tapestry Configuration Panel

**Architecture decision:** Store Queen Tapestry's persona config in `app_settings` table (already exists). Add new keys:
- `bot_prompt_vibe` — persona prompt for vibe sessions
- `bot_prompt_dm` — persona prompt for DM circle chat
- `bot_model` — AI model to use (dropdown)
- `bot_max_tokens` — max response length
- `bot_max_nudges` — how many times she nudges before going quiet

The edge functions will read these settings at runtime from `app_settings` instead of using hardcoded constants. The admin panel gets a new "Queen Tapestry" configuration card.

**Data flow:**
```text
Admin Panel → admin-api (set_bot_config action) → app_settings table
                                                        ↓
                    direct-chat / vibe-bot-chat read at request time
```

**Why not hardcode in edge functions?** Because every persona tweak currently requires a code deployment. Storing in `app_settings` means real-time adjustments without code changes — a critical operational requirement for a live product.

---

### Technical Implementation Plan

#### Step 1: Populate app_settings with bot config defaults
Insert new rows into `app_settings`:
- `bot_prompt_vibe` → current vibe prompt text
- `bot_prompt_dm` → current DM prompt text  
- `bot_model` → `google/gemini-3-flash-preview`
- `bot_max_tokens` → `150`
- `bot_max_nudges` → `3`

#### Step 2: Update `supabase/functions/direct-chat/index.ts`
- Remove hardcoded `QUEEN_TAPESTRY_PROMPT` constant
- At request time, fetch `bot_prompt_dm`, `bot_model`, `bot_max_tokens` from `app_settings`
- Switch to `google/gemini-3-flash-preview` as the model
- Add retry: if first model call fails, retry with `google/gemini-2.5-flash-lite`
- Fix CORS headers to include all required headers (currently missing some)

#### Step 3: Update `supabase/functions/vibe-bot-chat/index.ts`
- Remove hardcoded `QUEEN_TAPESTRY_PROMPT` and `MAX_UNANSWERED_NUDGES` constants
- Fetch `bot_prompt_vibe`, `bot_model`, `bot_max_tokens`, `bot_max_nudges` from `app_settings`
- Switch model + add retry logic

#### Step 4: Update `supabase/functions/admin-api/index.ts`
Add a new `set_bot_config` action that accepts a `configs` object (key-value pairs) and batch-updates `app_settings`. Also add `get_bot_config` to the `dashboard` response.

#### Step 5: Update `src/pages/Admin.tsx`
Add a new **"Queen Tapestry AI"** configuration card below the Matching Mode card with:
- **Model selector** — dropdown: `google/gemini-3-flash-preview`, `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`
- **Max tokens** — number input (50–500)
- **Max nudges (Vibe)** — number input (1–10)
- **Vibe Persona Prompt** — large textarea (the prompt for vibe sessions)
- **DM Persona Prompt** — large textarea (the prompt for circle DMs)
- **Save** button that calls `admin-api` with `set_bot_config`

The admin sees exactly what Queen Tapestry will say and how she'll behave. Real-time updates, no deployments needed.

#### Step 6: Display name in Friends.tsx
The existing code `displayName ?? username ?? "Unknown"` is correct. The "QyLSSxn7" is valid data. However, to make it clearer and encourage profile completion, add a subtle tooltip/tag showing "Tapestry ID" for names that look like auto-generated handles (purely alphabetic 8-char strings). This is cosmetic only.

---

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/direct-chat/index.ts` | Read prompt from DB, fix model, add retry |
| `supabase/functions/vibe-bot-chat/index.ts` | Read prompt/config from DB, fix model, add retry |
| `supabase/functions/admin-api/index.ts` | Add `get_bot_config` + `set_bot_config` actions |
| `src/pages/Admin.tsx` | Add Queen Tapestry configuration card |

### Database Changes
Insert 5 new rows into `app_settings`:
```sql
INSERT INTO app_settings (key, value) VALUES
  ('bot_model', 'google/gemini-3-flash-preview'),
  ('bot_max_tokens', '150'),
  ('bot_max_nudges', '3'),
  ('bot_prompt_vibe', '...vibe prompt...'),
  ('bot_prompt_dm', '...dm prompt...')
ON CONFLICT (key) DO NOTHING;
```

### Advisory Challenges to My Own Plan

**Challenge 1:** Storing prompts in DB adds latency (one extra read per message). **Mitigation:** The `app_settings` table is tiny and the read costs <5ms — acceptable tradeoff for operational flexibility.

**Challenge 2:** Prompts in a DB can be accidentally wiped. **Mitigation:** The edge functions should fall back to a hardcoded safe default if the DB setting is missing.

**Challenge 3:** The display name issue ("QyLSSxn7") is not a bug — it's a UX/product gap. Users need a way to set human names. **Deferred:** Profile editing already exists in `EditProfileSheet.tsx` — ensure `display_name` can be set there. Out of scope for this fix.

### What NOT to Do
- Do not rename or change the fallback reply string — fix the model call so it never hits the fallback
- Do not add more hardcoded prompts — move everything to `app_settings`
- Do not change the display name logic in `Friends.tsx` — the code is correct, the data is the issue
