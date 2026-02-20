
## AI-Generated Vibe Opener — Dynamic, Unique Every Time

### The Problem With Hardcoded Openers

Right now, `vibe-match/index.ts` picks randomly from 8 fixed strings. Even with 8 options, a frequent user will cycle through all of them within their first week. And you're right — no human texts the same opening line twice. The probability of a real person starting with the exact same high-energy opener in back-to-back sessions is effectively zero. A hardcoded list will always feel robotic to power users.

There is also a second problem hiding in `vibe-match-poll/index.ts` — the poll fallback path (for users who waited and got bot-matched from the queue) still uses the **old Amara greetings** that reveal the name. That was missed in the last fix.

---

### The Solution: AI-Seeded Dynamic Openers

Instead of picking a hardcoded string, the `vibe-match` function will:

1. Pick one of the 8 openers as a **creative seed / style reference**
2. Call the AI with a focused one-shot prompt: *"Here is an example opener in your style. Generate a completely different opener in the same spirit — same energy, same personality, no name reveal, no intro, direct and punchy. One sentence only."*
3. Store the AI-generated opener in the session's `chat_log`
4. Return it to the client as `initialMessages`

If the AI call fails (network error, rate limit, etc.), it falls back to the seed string itself — so the user always sees something.

**Key design choices:**
- The AI call is deliberately minimal: 1 system message + 1 user message, `max_tokens: 60`. This keeps latency low (under 500ms) and cost negligible.
- The seed is picked randomly, so the AI has a different creative starting point each time — even if the AI generated something similar before, the seed variation steers it differently.
- No extra round-trip to the client — the greeting is generated server-side and embedded into the session before the response is returned.
- `vibe-match-poll` gets the same treatment, replacing the old `AMARA_GREETINGS` (still Amara-named) with the same AI generation logic.

---

### What Changes

**`supabase/functions/vibe-match/index.ts`**

- Add a `generateOpener(apiKey, seed, botPrompt)` async function that calls the AI gateway with a tight prompt
- Replace the one-liner `BOT_GREETINGS[random]` with `await generateOpener(...)`
- The 8 seeds remain as the pool of style references — they are not shown to users directly anymore

**`supabase/functions/vibe-match-poll/index.ts`**

- Fix the still-broken `AMARA_GREETINGS` array (old name-revealing greetings — missed in the last fix)
- Apply the same `generateOpener(...)` pattern for the bot-fallback path

---

### The AI Prompt for Opener Generation

```
SYSTEM: You are Queen Tapestry — a sharp, Lekki-raised, well-traveled 25-year-old woman. 
You're on a 60-second vibe-matching app. Generate ONE opening message. 
Rules: No name, no intro, no "I'm...", immediate personality, punchy, max 1 sentence, 
0-1 emoji, unique every time.

USER: Here's an example of your style: "{seed}"
Generate a completely different opener with the same energy. One sentence only.
```

`max_tokens: 60` — enough for one punchy sentence, fast to generate.

---

### Latency Consideration

The AI call adds ~300–600ms to the match response. This is acceptable because:
- The user has just been through a "searching" animation
- There is already a `chat_starts_at` delay of 4 seconds before chat opens
- The opener generation happens in parallel with the session insert, not sequentially

To make it parallel: `Promise.all([session insert, generateOpener()])` — both happen simultaneously. The session is created with the AI greeting inserted.

---

### Fallback Safety

If `generateOpener()` fails for any reason:
- Returns the seed string directly (still a good, name-free opener)
- Never throws — wrapped in try/catch
- No user-visible error

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/vibe-match/index.ts` | Add `generateOpener()` helper, replace hardcoded pick with AI call, insert generated greeting into session |
| `supabase/functions/vibe-match-poll/index.ts` | Replace old `AMARA_GREETINGS` (still name-revealing), apply same `generateOpener()` for bot fallback path |

No UI changes. No schema changes. No new edge functions.

### What Is NOT Changing
- The `vibe-bot-chat` function (handles subsequent messages — this is only the opener)
- The nudge timing logic in `VibeMatch.tsx`
- The `direct-chat` function
- Any admin panel settings
