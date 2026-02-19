
## Three Issues, Three Root Causes, Three Clean Fixes

### Advisory Council Diagnosis

**This is not one problem — it is three independent failures that happen to be visible at the same time. Treating them as one will create confusion. Each must be diagnosed and fixed at its correct layer.**

---

### Issue 1: What is "Tapestry ID" vs Display Name?

**Conceptual clarification (for product decisions):**

Tapestry is an external social graph protocol. When a user creates a profile, they pick a `username` (like "Jack_ma"). The Tapestry API stores this.

Locally, the `profiles` table has three name fields:
- `username` — the short handle from Tapestry (e.g. "QyLSSxn7" or "Jack_ma")
- `display_name` — what shows in the app UI (should equal the Tapestry username)
- `tapestry_id` — currently null for most users (was meant to store the ID but never properly written)

For wallet `QyLSSxn7pbLo8cTbpZmNimmCk8Qf1M4EEUptwb16eun`:
- Their **Tapestry username is "Jack_ma"** — confirmed in edge function logs
- But their local DB still has `display_name: "QyLSSxn7"` (the old auto-generated handle from before they changed their Tapestry name)
- The DB was **never updated** after they changed their Tapestry username because the lookup mode doesn't write back to the DB

**The Tapestry ID should be the username they chose — it is NOT their wallet address. The wallet address is just used to find them on Tapestry.**

---

### Issue 2: Why Does "Jack_ma" Not Show? (Root Cause)

In `supabase/functions/tapestry-identity/index.ts`, the **LOOKUP MODE** (lines 196–231) correctly calls Tapestry and gets back `username: "Jack_ma"` — but it **only builds a response object and never writes back to the database**.

The DB write only happens in **CREATE MODE** (lines 170–193).

So:
- User created their profile with handle "QyLSSxn7" → DB written correctly
- User later changed their Tapestry username to "Jack_ma" (on Tapestry or during a re-login)
- Every subsequent lookup fetches "Jack_ma" from Tapestry but discards it without updating the DB
- The UI reads `display_name` from the DB → still sees "QyLSSxn7"

**Fix: In LOOKUP MODE, after getting a fresh Tapestry username, upsert `display_name` and `username` in the local DB if they differ from what Tapestry returns.**

This is a one-line addition to the lookup path — and it means any time a user logs in, their display name automatically syncs to whatever is current in Tapestry.

---

### Issue 3: Queen Tapestry Not Responding (Root Cause)

From the logs, the pattern is clear:

```
AI gateway error: 500 - primary model (google/gemini-2.5-pro)
AI gateway error: 500 - fallback model (google/gemini-2.5-flash-lite)
→ hardcoded fallback string fires: "Hey! What's good?"
```

Wait — the network response shows "Hey! Sorry, got distracted for a sec." still appearing in the conversation history. That is an OLD message already stored in the `direct_messages` table from before the code fix. It is NOT being generated now. The function currently IS falling back to "Hey! What's good?" when both models fail.

**The actual problem: `google/gemini-2.5-pro` is consistently returning HTTP 500 from the AI Gateway.** The admin changed the model to `google/gemini-2.5-pro` via the admin panel, and that model appears to be unavailable or overloaded right now.

**The fix has two parts:**

**Part A — Model selection:** Switch the primary to `google/gemini-3-flash-preview` which was working (the `vibe-bot-verdict` succeeded recently), and keep `openai/gpt-5-nano` as a second fallback (different provider entirely, so if Google's gateway is down, OpenAI still works). Also add a third fallback to `google/gemini-2.5-flash-lite`.

**Part B — Defensive coding:** The `direct-chat` function currently returns `{"ok": true}` even when the AI fails and uses the fallback string. The function should still save the message but log clearly that AI failed. More importantly, the fallback string should NOT be "Hey! Sorry, got distracted" (that's the old code) or "Hey! What's good?" — it should be a message that feels natural and continues the conversation, like "Give me a sec... what did you say again?" — but the real fix is making the AI actually work.

**Part C — The `is_mutual_friend` check is blocking:** The `direct-chat` function checks `is_mutual_friend` before processing. For Queen Tapestry (a bot), this friendship is stored differently. Looking at the conversation table — conversations exist and messages ARE being inserted and Queen Tapestry IS replying. So the mutual friend check is passing. The issue is purely the AI gateway returning 500.

---

### Implementation Plan

#### Fix 1: `tapestry-identity/index.ts` — Sync display_name on lookup
In the LOOKUP MODE section (after line 219 where `profile` is built), add a DB write using the service role key to update `display_name` and `username` if the Tapestry username is different from what's currently stored.

```
if (uname) {
  // Sync display_name to current Tapestry username
  const supabase = createClient(supabaseUrl, serviceKey);
  await supabase.from("profiles")
    .update({ display_name: uname, username: uname, tapestry_id: uname })
    .eq("wallet_address", walletAddress)
    .not("display_name", "eq", uname); // only update if different (avoid unnecessary writes)
}
```

This means every time any user logs in, their display name self-heals to match Tapestry.

#### Fix 2: `direct-chat/index.ts` — Multi-model fallback chain
Replace the two-model fallback with a three-model chain:
1. Primary: read from `app_settings` (currently `google/gemini-2.5-pro`)
2. Fallback 1: `google/gemini-3-flash-preview`
3. Fallback 2: `openai/gpt-5-nano`

Also update the `app_settings` default for `bot_model` back to `google/gemini-3-flash-preview` since `google/gemini-2.5-pro` is consistently returning 500. The admin can change this at any time via the admin panel.

#### Fix 3: Update `app_settings` bot_model back to working model
The admin changed `bot_model` to `google/gemini-2.5-pro` via the admin panel — that model appears to be consistently returning 500. Reset it to `google/gemini-3-flash-preview` via a database update. No migration needed — just a direct `UPDATE app_settings SET value = 'google/gemini-3-flash-preview' WHERE key = 'bot_model'`.

#### Fix 4: `vibe-bot-chat/index.ts` — Same three-model fallback chain
Apply the same multi-provider fallback to the vibe chat bot.

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/tapestry-identity/index.ts` | Add DB write in LOOKUP MODE to sync display_name/username from Tapestry |
| `supabase/functions/direct-chat/index.ts` | Add three-model fallback chain (gemini-3-flash-preview → gpt-5-nano → gemini-2.5-flash-lite) |
| `supabase/functions/vibe-bot-chat/index.ts` | Same three-model fallback chain |

### Database Change (no migration needed — just a settings update)
Reset `bot_model` in `app_settings` back to `google/gemini-3-flash-preview` via direct SQL update.

### What Is NOT Changing
- No UI changes — `Friends.tsx` display name logic is already correct (`displayName ?? username`)
- No schema changes
- No RLS policy changes
- Admin panel Queen Tapestry card stays as-is — it works correctly and correctly saved the `gemini-2.5-pro` setting

### Advisory Challenge to My Own Plan
**Challenge:** Why is `google/gemini-3-flash-preview` reliable but `google/gemini-2.5-pro` not? They're both on the same gateway.

**Answer:** Preview models are often on separate infrastructure with higher availability. The `gemini-2.5-pro` may have rate limits or be in higher demand. Adding a cross-provider fallback (OpenAI `gpt-5-nano`) ensures that if Google's models are down entirely, the bot still responds via OpenAI's infrastructure. This is the correct production-grade approach.

**Challenge:** Will adding a DB write in lookup mode cause performance issues?

**Answer:** The write only fires when the Tapestry username DIFFERS from what's in the DB (`.not("display_name", "eq", uname)`). After the first sync, subsequent logins skip the write entirely. Cost is ~5ms per new sync, zero on subsequent calls.
