
## Three Bugs, Three Clean Fixes

### Bug 1: DM Hallucination (Queen Tapestry Repeating Herself)

**Root cause — confirmed from DB:**
The `direct-chat` function loads the last 30 messages and sends all of them as AI context. When a conversation stays on one topic for many turns (e.g., the gorilla animation thread), the AI sees 30 messages about the same subject with no instruction to avoid repeating phrases it already used. It then produces near-identical responses because the context window is "stuck in a groove."

There are two compounding factors:
1. `bot_max_tokens` is currently set to **300** — this is too high. Higher tokens = longer, more wandering replies that are more likely to echo previous content.
2. There is no explicit instruction in the prompt telling the bot to **scan its own recent replies and avoid repeating phrases**.

**Fixes:**
- In `direct-chat/index.ts`: Before building `aiMessages`, extract the bot's last 5 replies and inject them into the system prompt as a "DO NOT REPEAT" block. This gives the model explicit memory of what it just said.
- Reduce `bot_max_tokens` from 300 to 120 in `app_settings`. Shorter = punchier = more natural texting = less repetition risk.
- Also trim context: instead of sending all 30 messages, send the most recent 20. The older messages add noise when the topic has already drifted.
- Add an explicit rule to `bot_prompt_dm` in `app_settings`: "CRITICAL: Scan your previous messages in this conversation. Do NOT repeat any phrase, sentence, or idea you already expressed. If you catch yourself saying 'Wait' or 'I think I saw' — stop and rephrase completely."

---

### Bug 2: Vibe Chat Opens With "Amara" and Same Line Every Time

**Root cause — confirmed in `vibe-match/index.ts` lines 12-17:**
```
const AMARA_GREETINGS = [
  "Hey! 👋 I'm Amara. So tell me, what's your vibe?",
  "Hi there! I'm Amara, based in Lagos. What brings you here today?",
  "Hey! Amara here. I'm curious — what's your story?",
  "Hello! I'm Amara. Let's see if we click sha 💛 What do you do?",
];
```

All 4 hardcoded greetings reveal the name "Amara" — the bot's internal codename that should NEVER be shown to users. The persona is "Queen Tapestry." These greetings were written before the persona was locked in and were never updated.

Additionally, since only 4 options exist and the user has played multiple times, they see the same opener repeatedly. The bot also calls the USER "Amara" in follow-up messages because the model sees "Amara" in the chat_log and confuses it as a user name.

**Fix:**
Replace `AMARA_GREETINGS` in `vibe-match/index.ts` with 8+ diverse, name-free openers that reflect Queen Tapestry's actual persona — curious, sharp, Lekki-flavored, no name reveal. These should be varied enough that repeat users rarely see the same one twice.

New greetings (no name, no self-introduction, immediate personality):
```
"You got 60 seconds to convince me you're interesting. Go. 👀",
"Okay so — Lagos or outside? Let's start there.",
"First question: NFTs or music? Don't overthink it.",
"Right, so are you the type who talks about doing things, or are you actually doing them?",
"Not going to waste time on small talk — what's the last thing that genuinely surprised you?",
"Quick vibe check: what's your current obsession? Could be anything.",
"So what's the energy today — work stress or unbothered?",
"I'm going to ask you something and I want a real answer: what's actually on your mind lately?",
```

---

### Bug 3: Vibe Bot Sends Unprompted Second Message to Herself

**Root cause — in `src/pages/VibeMatch.tsx` lines 66-87:**
The nudge interval fires every 5 seconds and checks `Date.now() - lastUserMessageTime.current >= 15000`. But `lastUserMessageTime.current` is initialised at component mount time — NOT at the time the bot sends her first greeting. So:

1. Bot match is made → bot greeting appears (t=0)
2. User reads the greeting (takes ~5-10 seconds naturally)
3. Nudge interval fires at t=15s since mount → `silenceDuration >= 15000` → TRUE
4. `nudgeSentCount.current < 3` → TRUE (it's 0)
5. Bot fires a second unprompted message BEFORE the user has had a reasonable chance to reply

This is why she sends "I'm basically a mix of Lekki energy..." as a self-nudge — the nudge fires too early.

Additionally, the `vibe-bot-chat` nudge path for `consecutiveBotMessages === 0` says:
```
"The other person hasn't said anything yet. Send a natural, unique opener..."
```
But since the greeting is already in `chat_log` (sent by BOT_WALLET), `consecutiveBotMessages` will be 1, not 0 — so it falls into the "follow-up" branch and the AI generates a second message about herself, which looks like she's talking to herself.

**Fix:**
- **Increase the nudge silence threshold from 15 seconds to 30 seconds** for the first nudge (consecutiveBotMessages === 0 means no user reply yet). This gives users a proper window to read and type.
- **Set `lastUserMessageTime.current` to the time the bot's greeting was received** (when `initialMessages` arrive), not mount time. This ensures the 30-second clock starts when the user actually sees the bot's message.
- **Add a minimum delay**: never send a nudge within the first 20 seconds of the session starting regardless.

---

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/vibe-match/index.ts` | Replace `AMARA_GREETINGS` with 8 name-free, persona-authentic openers |
| `src/pages/VibeMatch.tsx` | Fix nudge timing: set `lastUserMessageTime` on bot greeting receipt; increase threshold to 30s; add 20s minimum session guard |
| `supabase/functions/direct-chat/index.ts` | Inject bot's last 5 replies as anti-repetition context; trim to 20 messages |

### Database Change (no migration — settings update only)
- Update `bot_max_tokens` from 300 → 120 in `app_settings`
- Update `bot_prompt_dm` to add the CRITICAL anti-repetition rule at the top of the RULES section

### What Is NOT Changing
- The AI model chain (already fixed and working — logs show no gateway errors)
- The `is_mutual_friend` check (working correctly)  
- The admin panel (no changes needed)
- The `vibe-bot-chat` nudge logic in the edge function (the issue is in the React timing, not the edge function)
- Schema or RLS policies

### Challenge to My Own Plan
**Challenge:** Won't reducing max_tokens to 120 make replies too short?

**Answer:** The prompt already says "1-3 sentences max." 120 tokens is about 90 words — plenty for 3 natural sentences. The current 300 token limit is causing the model to write longer, more repetitive answers. Shorter = better for a chat persona.

**Challenge:** Won't 8 greetings still repeat for heavy users?

**Answer:** Yes, but far less than 4. The real fix is eventually making the greeting AI-generated on each session start (so it's always unique). That's a future improvement — for now 8 well-crafted openers are a significant improvement over 4 name-revealing ones.
