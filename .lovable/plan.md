

## Fix Verdict Race Condition, Add Feedback, Chat Enhancements, and Synchronized Start

### The Problems

1. **"Maybe next time" bug**: When User A votes first, the backend returns `{ mutual: false, waiting: true }` because User B hasn't voted yet. The client immediately shows the "Maybe next time" result screen instead of waiting for User B. This is the core bug.

2. **No feedback screen**: After the timer ends, users go straight to Vibe/Nah buttons. There's no screen where users can leave a short message/feedback before voting. The bot (Amara) has this via AI-generated feedback, but human matches don't.

3. **No synchronized start**: Both users' timers start independently whenever they enter the chat phase, causing uneven session lengths.

4. **No quick-access smileys or text assistance**: The chat input is plain text only.

---

### Fix 1: Verdict Waiting + Polling (Critical Bug Fix)

**Root cause**: The client receives `{ waiting: true }` from `vibe-verdict` when the partner hasn't voted yet, but treats it as a final "not mutual" result.

**Solution**: Add a new phase `"waiting-verdict"` between verdict submission and result display. The client polls the session until the partner also submits their verdict.

**Changes**:
- `src/pages/VibeMatch.tsx`: Add a `"waiting-verdict"` phase. After submitting verdict, if response has `waiting: true`, enter this phase and poll `vibe-verdict-poll` (a new lightweight endpoint) every 2 seconds until both verdicts are in.
- New edge function `supabase/functions/vibe-verdict-poll/index.ts`: Takes `sessionId` and `walletAddress`, checks if both verdicts are submitted. If yes, runs the mutual logic (friendship creation, Tapestry follows, vibe score increments) and returns the final result. If not, returns `{ waiting: true }`.
- Update `supabase/functions/vibe-verdict/index.ts`: When the second user submits and both verdicts are in, process the mutual logic as before. The first user's poll will also detect completion and get the result.

**UI during waiting**: Show a "Waiting for [partnerName] to decide..." screen with a gentle animation.

---

### Fix 2: Post-Session Feedback Screen

**Flow change**: Timer ends -> Feedback screen (write a short message + pick Vibe/Nah) -> Waiting for partner -> Result screen showing both feedbacks.

**Changes**:
- New component `src/components/play/VibeFeedback.tsx`: Shows a text input for a short feedback message (max 140 chars), the partner's `display_name` (not real_name), and the Vibe/Nah buttons. Submitting sends both the feedback text and the verdict together.
- `src/pages/VibeMatch.tsx`: Replace the current `VibeVerdict` component with `VibeFeedback`. The phase flow becomes: `searching -> chatting -> feedback -> waiting-verdict -> result`.
- `supabase/functions/vibe-verdict/index.ts`: Accept an optional `feedback` field. Store it in the session (new columns `user_a_feedback` and `user_b_feedback`).
- Database migration: Add `user_a_feedback TEXT` and `user_b_feedback TEXT` columns to `vibe_sessions`.
- Result screen: Display both users' feedback messages alongside the Vibe/Nah outcome, using `display_name`.

---

### Fix 3: Synchronized Countdown Start

**Problem**: Each user's `GameTimer` starts as soon as they enter the `chatting` phase, but they may enter at different times.

**Solution**: Add a `"countdown"` phase with a 3-2-1-GO animation. The session stores a `chat_starts_at` timestamp set 4 seconds in the future when the match is confirmed. Both clients sync to this timestamp.

**Changes**:
- `supabase/functions/vibe-match/index.ts` and `supabase/functions/vibe-match-poll/index.ts`: When a match is confirmed, set `chat_starts_at` on the session (a new column) to `now() + 4 seconds`. Return this timestamp in the match response.
- Database migration: Add `chat_starts_at TIMESTAMPTZ` column to `vibe_sessions`.
- `src/pages/VibeMatch.tsx`: New `"countdown"` phase between `searching` and `chatting`. On match, calculate the delay until `chat_starts_at`, show "3... 2... 1... GO!" animation timed to that moment, then transition to `chatting`.
- New component `src/components/play/MatchCountdown.tsx`: Renders the 3-2-1-GO animation with Framer Motion.

---

### Fix 4: Quick Smileys in Chat

**Changes**:
- Update `src/components/demo/ChatZone.tsx`: Add a row of 5 emoji buttons above the text input. Tapping one immediately sends that emoji as a message.
- Emojis: fire, laughing face, heart eyes, thumbs up, 100 (the 5 most universally used quick-reaction emojis).
- Small, tappable buttons that don't take up much space.

---

### Fix 5: Predictive Text Suggestions

**Changes**:
- Update `src/components/demo/ChatZone.tsx`: Add a suggestion bar above the input that shows 2-3 word completions based on what the user is typing.
- Client-side only: Use a small dictionary of common conversational phrases. When the user types 2+ characters, filter matching phrases and show as tappable chips.
- Tapping a suggestion fills the input with that word/phrase.
- Common phrases list: ~50 phrases like "what's up", "that's cool", "where are you from", "nice to meet you", "haha", "for real", etc.

---

### Fix 6: Auto-Correct Suggestions (Lightweight)

This is the most complex feature requested. To keep it simple and effective:

**Changes**:
- Add a toggle in the chat header to enable/disable auto-correct (on by default).
- When the user finishes typing a word (hits space), check it against a basic word list. If not found, highlight it with an underline.
- Tapping the highlighted word shows a small popover with 1-2 suggestions. Tapping a suggestion replaces the word; tapping elsewhere dismisses it.
- This uses a client-side dictionary approach -- no AI calls needed for basic spell checking.

---

### Technical Summary of All Files

| File | Change |
|------|--------|
| `supabase/migrations/...` | Add `user_a_feedback`, `user_b_feedback`, `chat_starts_at` to `vibe_sessions` |
| `supabase/functions/vibe-verdict/index.ts` | Accept `feedback` field, save to session, fix race condition handling |
| `supabase/functions/vibe-verdict-poll/index.ts` | **New** -- poll for partner's verdict, process mutual logic when both are in |
| `supabase/functions/vibe-match/index.ts` | Set `chat_starts_at` when match confirmed |
| `supabase/functions/vibe-match-poll/index.ts` | Return `chat_starts_at` in match response |
| `src/pages/VibeMatch.tsx` | New phases: `countdown`, `feedback`, `waiting-verdict`. Updated flow and polling |
| `src/components/play/VibeFeedback.tsx` | **New** -- feedback input + verdict buttons |
| `src/components/play/MatchCountdown.tsx` | **New** -- 3-2-1-GO countdown animation |
| `src/components/demo/ChatZone.tsx` | Add emoji bar, predictive text suggestions, basic auto-correct toggle |
| `src/components/play/VibeVerdict.tsx` | Deprecated (replaced by VibeFeedback) |

### Phase Flow (Updated)

```text
searching -> countdown (3-2-1-GO) -> chatting (60s) -> feedback (write + vote) -> waiting-verdict (poll) -> result (show both feedbacks)
```

### Priority Order

1. Verdict race condition fix (critical bug)
2. Synchronized countdown
3. Feedback screen
4. Quick smileys
5. Predictive text
6. Auto-correct

