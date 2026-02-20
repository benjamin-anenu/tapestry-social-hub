
## Root Cause Found — Two Distinct Issues

### What the Database Reveals

Querying the actual session from the problem report shows this exact sequence:

```
t=0s    BOT:  "Skip the resume and tell me the one hill..."  ← AI-generated opener
t=9s    USER: "😂"                                           ← user DID reply
t=11s   BOT:  "Plantain should only be fried when it's..."  ← normal reply to "😂"
t=42s   BOT:  ""                                             ← nudge fires — EMPTY STRING
```

Two separate problems are happening:

---

### Problem 1 — The Nudge Fires Too Soon After Bot Replies

**The flaw in the current logic:**

`lastUserMessageTime.current` resets when the USER sends a message (in `handleSendMessage`). But here's what actually happens:

1. User sends "😂" → `lastUserMessageTime.current = now` (say, t=9s)
2. Bot generates "Plantain..." reply → takes ~2s → shown at t=11s
3. Nudge interval fires at t=14s (every 5s, next tick after bot reply)
4. `sessionAge` check: 35s guard — passes if session was started >35s ago
5. `silenceDuration = now - lastUserMessageTime.current` = `t=14s - t=9s` = **5 seconds** — this should FAIL the 30s threshold

Wait — but the DB shows the nudge fired at t=42s, which IS >30s after the user's t=9s message. So the timing guard IS working, but the bot fires after 30s of silence which is exactly correct behaviour... except the user may have expected more time to respond to the bot's "Plantain" message.

**The real issue:** `lastUserMessageTime.current` resets on USER message — but NOT when the BOT sends a reply. So after the bot replies at t=11s, the 30s silence clock is still counting from t=9s (user's "😂"), NOT from t=11s (when the bot finished replying). This means the user has only ~28s of actual reading/thinking time from when the bot's reply appeared, not 30s.

**But more critically:** The bot's reply appears at t=11s. The nudge fires at t=42s (30s after user's "😂" at t=9s — but only 31s after the bot's reply). The user sees the bot reply at t=11s and effectively only has ~31s to read it and respond before a nudge fires. Given the context (reading "Plantain should only be fried when it's borderline overripe, almost black..."), this is tight.

**The clean fix:** Reset `lastUserMessageTime.current` to `Date.now()` immediately after the bot sends its reply in `handleSendMessage`. This way the 30s silence timer starts from when the USER SEES the bot's response, not from when the user last typed.

---

### Problem 2 — Empty String Bot Message Appended to Chat Log

The database shows message 4 is literally `""` (empty string). The `callAI` function returns `data.choices?.[0]?.message?.content?.trim() ?? null`. If the AI returns an empty or whitespace-only string, `trim()` produces `""` — which is truthy-falsy ambiguous in JS. The fallback chain only triggers on `null`, not on `""`. So an empty string passes all the way through and gets appended to the DB and shown in the UI.

**Fix:** In `vibe-bot-chat/index.ts`, add a guard: if `amaraResponse` is an empty string after all fallbacks, return `{ ok: true, botReply: null, silenced: true }` instead of appending it. Also fix `callAI` to return `null` if the trimmed content is empty.

---

### Files to Change

**`src/pages/VibeMatch.tsx`** — one change only:
In `handleSendMessage`, after the bot's reply is appended via `setMessages`, immediately reset `lastUserMessageTime.current = Date.now()`. This means the 30s silence window starts from when the bot finishes replying, not from when the user last typed.

```tsx
// After:
if (data?.botReply) {
  setMessages((prev) => [...prev, { time: Date.now(), sender: "them", text: data.botReply }]);
  lastUserMessageTime.current = Date.now(); // ← ADD THIS
}
```

**`supabase/functions/vibe-bot-chat/index.ts`** — two changes:
1. In `callAI`: return `null` if trimmed content is empty (`content?.trim() || null` instead of `content?.trim() ?? null`)
2. Before appending bot response: add guard — `if (!amaraResponse || amaraResponse.trim() === "") return silenced response`

---

### What Is NOT Changing
- The 35s session guard (working correctly)
- The 30s silence threshold (correct — just needs to start from bot reply time, not user message time)
- The nudge count limit (`bot_max_nudges = 3`)
- The edge function model chain
- Schema, RLS, or any other files
