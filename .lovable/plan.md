

## Add "Amara Femilade" — AI Vibe Match Partner

### What We're Building

A persistent AI profile named **Amara Femilade** (nickname: Queen Tapestry, socials: Sol_Tapestry) who acts as a fallback Vibe Match partner when no real humans are online. She chats like a real Nigerian woman, evaluates you based on Nigerian social standards, and submits her own verdict after the 60 seconds.

### How It Works (End-to-End Flow)

1. User clicks "Vibe Match" -- the `vibe-match` function searches for online humans first
2. If no humans found, it matches the user with Amara instead of showing "No one online"
3. During the 60-second chat, every message the user sends triggers an AI-generated response from Amara via a new `vibe-bot-chat` Edge Function (using Lovable AI / Gemini)
4. Amara initiates the conversation with a greeting (she doesn't wait silently)
5. When the timer ends, the user submits their verdict. Simultaneously, a `vibe-bot-verdict` Edge Function evaluates the full chat log through AI and submits Amara's verdict automatically
6. If mutual "vibe" -- friendship is created, profile details revealed (as already implemented)
7. If either says "nah" -- no connection, move on

---

### Step 1: Seed Amara's Profile (Database Migration)

Insert a bot profile into the `profiles` table:

- `wallet_address`: `BOT_AMARA_001` (follows existing bot prefix convention)
- `username`: `queen_tapestry`
- `display_name`: `Amara Femilade`
- `real_name`: `Amara Femilade`
- `city`: `Lagos`
- `country`: `Nigeria`
- `x_handle`: `Sol_Tapestry`
- `instagram_handle`: `Sol_Tapestry`
- `bio_text`: A short, authentic Nigerian bio
- `is_bot`: `true`
- `is_online`: `true` (always online)
- `vibe_score`: 42

---

### Step 2: Modify `vibe-match` Edge Function

Current behavior: filters `is_bot = false`, returns error if no humans found.

New behavior:
- Keep the human-first search (unchanged)
- If no humans found, query for Amara specifically (`is_bot = true`, `wallet_address = 'BOT_AMARA_001'`)
- Return the session with an extra flag `isBot: true` so the frontend knows to enable AI chat mode
- Amara sends the first message automatically (inserted into `chat_log` at session creation)

---

### Step 3: New `vibe-bot-chat` Edge Function

Triggered by the frontend whenever the user sends a message and `isBot` is true (instead of the normal `vibe-chat`).

Logic:
1. Receives `sessionId`, `walletAddress`, `text`
2. Appends the user's message to `chat_log`
3. Sends the full conversation history to Lovable AI (Gemini) with Amara's persona prompt
4. Amara's persona prompt includes:
   - She's a Nigerian woman from Lagos
   - She uses Nigerian slang naturally (not excessively)
   - She asks questions, shares opinions, teases gently
   - She evaluates: Are you genuine? Are you interesting? Can you hold a conversation?
   - She keeps messages short (1-2 sentences max, like real texting)
5. Appends Amara's response to `chat_log` using her `BOT_AMARA_001` wallet address
6. The existing Realtime subscription picks up the update automatically -- no frontend changes needed for message display

---

### Step 4: New `vibe-bot-verdict` Edge Function

Called by the frontend after the user submits their verdict, when the partner is a bot.

Logic:
1. Receives `sessionId`, `walletAddress`, `userVerdict`
2. Submits the user's verdict (same as current `vibe-verdict`)
3. Sends the full chat log to Lovable AI with a scoring prompt:
   - "Based on this conversation, would a real Nigerian woman vibe with this person?"
   - Criteria: authenticity, humor, respect, conversational effort, curiosity
   - Returns structured output: `{ verdict: "vibe" | "nah", reason: string }`
4. Submits Amara's verdict to the session
5. Checks mutual result and proceeds with friendship creation if mutual

---

### Step 5: Frontend Changes (`VibeMatch.tsx`)

Minimal changes:
- Track `isBot` state (returned from `vibe-match`)
- When `isBot` is true, call `vibe-bot-chat` instead of `vibe-chat` for sending messages
- When `isBot` is true, call `vibe-bot-verdict` instead of `vibe-verdict` for verdict submission
- Show typing indicator while waiting for Amara's AI response
- Display Amara's verdict reason in the result screen (e.g., "Amara says: You're funny but you need to ask more questions next time o!")

---

### Edge Cases and Loopholes (Brutal Honesty)

| Edge Case | How We Handle It |
|---|---|
| **User spams messages** | Rate-limit in `vibe-bot-chat` -- max 1 AI call per 3 seconds, queue extras |
| **User sends nothing for 60s** | Amara sends 2-3 follow-up messages on her own (timed prompts at ~15s and ~35s if no user messages) |
| **User sends offensive content** | Amara's prompt includes instruction to disengage gracefully and auto-verdict "nah" |
| **AI latency > 5s** | Show typing indicator; if timeout, use a fallback canned response |
| **Amara vibes but user says nah** | No friendship created (existing logic handles this correctly) |
| **User vibes but Amara says nah** | No friendship created; show Amara's reason for feedback |
| **Mutual vibe with a bot** | Friendship row is created; Amara's profile (Lagos, Sol_Tapestry socials) is revealed in My Circle. Tapestry API call will fail gracefully for bot usernames (already using `Promise.allSettled`) |
| **User matches Amara repeatedly** | Allowed -- each session is independent. Could add cooldown later if needed |
| **Realtime subscription** | Works as-is because messages use wallet_address as sender, and the frontend maps non-self senders to "them" |
| **Multiple users matching Amara simultaneously** | Each gets their own `vibe_sessions` row. AI responses are per-session. No conflicts |
| **Amara's "always online" status** | Set via migration; no heartbeat needed since she's a bot |
| **Chat log format compatibility** | Uses exact same `{ sender, text, time }` format as human chat |

### What This Does NOT Do (Limitations)

- Amara cannot initiate a match with you (only responds when matched)
- Amara's Tapestry social graph integration will be cosmetic (the bot username won't exist on Tapestry's actual API)
- Amara cannot play Arena games (this is Vibe Match only)

---

### Files to Create/Modify

| File | Action |
|---|---|
| Database migration | Seed Amara's profile |
| `supabase/functions/vibe-match/index.ts` | Add bot fallback logic |
| `supabase/functions/vibe-bot-chat/index.ts` | **New** -- AI-powered chat responses |
| `supabase/functions/vibe-bot-verdict/index.ts` | **New** -- AI-powered verdict |
| `supabase/config.toml` | Register 2 new functions |
| `src/pages/VibeMatch.tsx` | Route to bot functions when `isBot`, typing indicator, verdict reason display |

