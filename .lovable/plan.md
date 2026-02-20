
## Two Fixes: Text Alignment + Queen Tapestry Self-Reply Root Cause

---

### Fix 1: Card Subtitle Alignment

**What the user sees:** The text "60s vibe check with a random stranger" appears centered instead of left-aligned.

**Root cause (line 148, `MainHub.tsx`):**
```tsx
<span className="font-mono text-[10px] text-muted-foreground">
  {card.desc}
</span>
```
The parent `<div>` at line 139 uses `items-start` which should left-align children — but `font-mono text-[10px]` on a `<span>` still stretches to fill flex width on some screen sizes, causing it to appear centered. The fix is to add `text-left` explicitly to the `<span>` and ensure `w-full` on the text container div to prevent any ambiguity.

**Fix:** Add `text-left w-full` to the desc `<span>`.

---

### Fix 2: Queen Tapestry Talking to Herself — Root Cause Found

**Reverse-engineering the exact sequence of events:**

After the last round of fixes, the nudge timing in `VibeMatch.tsx` was improved. But there is **still one critical path** that bypasses those fixes completely:

**The `vibe-match-poll` path (lines 157–159 in `VibeMatch.tsx`):**

```tsx
if (data.isBot && Array.isArray(data.initialMessages)) {
  setMessages(data.initialMessages.map(...));
}
// ⚠️ MISSING: sessionStartTime.current and lastUserMessageTime.current are NOT reset here
```

Compare that to the `vibe-match` direct match path (lines 119–125):
```tsx
if (data.isBot && Array.isArray(data.initialMessages)) {
  const now = Date.now();
  sessionStartTime.current = now;       // ✅ Present
  lastUserMessageTime.current = now;    // ✅ Present
  nudgeSentCount.current = 0;           // ✅ Present
  setMessages(...);
}
```

**The poll path never resets the timers.** So when a user goes through the waiting → bot-fallback path (which is the most common path in `vibe-match-poll`), both `sessionStartTime.current` and `lastUserMessageTime.current` are still set to the **component mount time** — which could be 5–10 seconds BEFORE the bot match even arrives. The nudge interval then calculates:

```
sessionAge = now - sessionStartTime.current  
→ Already > 20,000ms (bypasses the minimum guard)

silenceDuration = now - lastUserMessageTime.current  
→ Already > 30,000ms (bypasses the silence threshold)
```

Result: The nudge fires **immediately** when the chatting phase opens, making it look like Queen Tapestry replied to herself before the user even had a chance to read her opener.

**Why does the `vibe-match` direct path sometimes also fail?**

Even in the direct match path, there is a race condition. The `sessionStartTime.current = now` is set at the moment `data.isBot && data.initialMessages` are processed — but the nudge `useEffect` depends on `[isBot, phase, sessionId, walletAddress]`. If React batches the state updates (`setIsBot(true)` → effect fires → `sessionStartTime` hasn't been set yet), the interval can start before the reset runs. This is a subtle but real ordering issue.

**The clean fix:**

1. **`VibeMatch.tsx` — poll path**: Add the same three timer resets to the `vibe-match-poll` handler that exist in the `vibe-match` handler:
   ```tsx
   if (data.isBot && Array.isArray(data.initialMessages)) {
     const now = Date.now();
     sessionStartTime.current = now;        // ADD THIS
     lastUserMessageTime.current = now;     // ADD THIS
     nudgeSentCount.current = 0;            // ADD THIS
     setMessages(...);
   }
   ```

2. **`VibeMatch.tsx` — increase minimum session guard**: Raise the minimum session guard from 20s to **35s**. The current 20s is still not enough if the bot greeting arrives at t=18s (e.g., AI generation took time). At 35s, the user always gets a comfortable reading window regardless of when the match was made.

3. **`vibe-bot-chat/index.ts` — the nudge instruction when `consecutiveBotMessages === 0`**: Currently this says:
   ```
   "The other person hasn't said anything yet. Send a natural, unique opener."
   ```
   But the greeting is already in `chat_log` — so `consecutiveBotMessages` is already 1. The check for `=== 0` is dead code and confusing. **Remove it** and consolidate nudge paths:
   - `consecutiveBotMessages === 1` → "They haven't replied yet. Try a different angle or ask something new."
   - `consecutiveBotMessages >= 2` → "Final quiet nudge — brief and natural."
   
   This prevents the AI from thinking it needs to "introduce itself again" which produces the self-talking intro messages.

---

### Files Changed

| File | Change |
|------|--------|
| `src/components/play/MainHub.tsx` | Add `text-left` to the desc `<span>` (line 148) |
| `src/pages/VibeMatch.tsx` | Add timer resets to poll path (lines 157–159); raise session guard to 35s |
| `supabase/functions/vibe-bot-chat/index.ts` | Fix nudge branch logic: remove dead `consecutiveBotMessages === 0` case, clean up nudge instructions |

No schema changes. No new functions. No new deployments beyond what's changed.
