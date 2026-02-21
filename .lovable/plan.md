

## Fix: Bot Still Attributing Its Own Words to the User

### What Is Happening

Session `dbd6cc72` proves the current anti-hallucination rule is not strong enough:

```
BOT:  "...before I decide if we can even sit at the same table."
USER: "😂"
BOT:  "Bold move setting the table rules already, I like that energy..."
```

The bot grabbed its own phrase ("the table") and told the user THEY made a "bold move setting the table" -- but the user only sent a laughing emoji. The bot is weaving its own previous words into the reply and attributing them to the user.

### Why the Current Fix Is Not Enough

The current instruction says: "Only respond to what the USER actually said in their last message." But AI models interpret this loosely -- they see the full conversation context and naturally reference earlier messages. The bot thinks it is "responding to the emoji in context," but it is actually projecting its own words onto the user.

### The Stronger Fix

In `supabase/functions/vibe-bot-chat/index.ts`, replace the generic anti-hallucination rule with a **dynamic instruction that explicitly states what the user's last message was**:

```
CRITICAL RULE: The user's last message was EXACTLY: "😂"
Respond ONLY to that message. Do NOT quote, paraphrase, or reference
anything YOU said in your previous messages. Do NOT attribute your own
words or topics to the user. The user said "😂" and nothing else —
react to THAT, not to your own previous message.
```

This is built dynamically by extracting the last user message from the chat log and injecting it literally into the system prompt. The AI can no longer "interpret" what the user said because the system prompt tells it exactly what was said.

### Technical Details

**File: `supabase/functions/vibe-bot-chat/index.ts`**

1. Find the last user message in the chat log (last entry where sender is not `BOT_AMARA_001`)
2. Replace the static `antiHallucinationRule` with a dynamic one that includes the actual user text:

```typescript
// Extract the user's actual last message
const lastUserMsg = [...chatLog]
  .reverse()
  .find((m) => m.sender !== BOT_WALLET);

const antiHallucinationRule = !isNudge && lastUserMsg
  ? `\n\nCRITICAL RULE: The user's last message was EXACTLY: "${lastUserMsg.text}"\nRespond ONLY to that message. Do NOT quote, paraphrase, or reference anything YOU said in your previous messages. Do NOT attribute your own words or topics to the user. React to what THEY said, not to what YOU said.`
  : "";
```

### What This Changes

| Before | After |
|--------|-------|
| Generic "only respond to user's last message" | System prompt tells the AI exactly what the user said, word-for-word |
| Bot could still "interpret" the emoji in context of its own words | Bot is explicitly told the user said "😂" and nothing else |
| Bot attributed "setting the table" to the user | Bot will react to the emoji itself without echoing its own phrases |

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/vibe-bot-chat/index.ts` | Replace static anti-hallucination rule with dynamic one that injects the user's exact last message into the system prompt |

No other files change. No schema changes.
