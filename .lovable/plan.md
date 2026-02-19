

## Show Proper Names in Circle + Make Queen Tapestry a Universal Friend with Smart DM Chat

### 1. Fix Display Names in My Circle and Chat

**Problem:** The circle list and chat headers show wallet-derived usernames like "QyLSSxn7" instead of proper names. The display_name field is null for real users, and the code prefers username over display_name.

**Fix:**
- **`src/pages/Friends.tsx` (line 22):** Change name resolution order to prefer `displayName` over `username`, so "Queen Tapestry" shows properly. Also always show the search bar (currently hidden unless >3 conversations).
- **`src/pages/FriendChat.tsx` (line 220):** Same fix -- prefer `displayName` over `username` for the chat header name.

### 2. Make Queen Tapestry Friends with Everyone

**Data inserts:** Queen Tapestry (profile `46f97bab`) is already friends with 2 users. Need to add mutual friendships + conversations for the remaining users:
- `d2cff6a6` (EFj94nBz)
- `81e7501f` (F8nWoPWM)

This means inserting 4 friendship rows (2 per user, both directions, mutual=true) and 2 conversation rows linking each user to Queen Tapestry.

### 3. Bot DM Chat -- Queen Tapestry Replies in Direct Messages

**Current limitation:** The `direct-chat` edge function only inserts messages. It doesn't generate AI replies when the receiver is a bot.

**New behavior:** Modify `direct-chat` to detect when `receiverProfileId` belongs to a bot profile (`is_bot = true`). When it does:
1. Load the conversation's vibe_session chat_log as context (so she "remembers" the vibe)
2. Load recent direct_messages for additional context
3. Call the AI gateway with the revamped Queen Tapestry prompt
4. Insert the bot's reply as a direct_message from the bot profile
5. Update the conversation's last_message fields

### 4. Completely Revamp Queen Tapestry's Persona

**Remove:** All "sha", "abi", "o" and heavy Nigerian slang directives. Remove the name "Amara Femilade" from the prompt so she never reveals it.

**New persona -- Queen Tapestry:**
- Sophisticated, well-traveled Lagos girl from Lekki. Went to uni abroad. Comfortable anywhere.
- Speaks clean, proper English by default. Can switch to pidgin if the other person initiates it. Can match any language the user speaks.
- Deeply knowledgeable about Solana, Web3, crypto culture -- but equally versed in fashion, entertainment, music, pop culture, news.
- Witty, makes real jokes (not generic ones). Empathetic when needed. Can get playful/wild but stays classy.
- Genuinely curious about people. Drives conversations, introduces herself, shares opinions.
- Not easy to impress but vibes hard when someone earns it.
- Never reveals she's AI. Never says her real name. Gives clever deflections if pressed.
- Each conversation opener is unique -- she checks what she said last time before generating a new one.

### 5. Fix Self-Talking / Hallucination During Vibe Sessions

**Problem:** When the user is silent, the nudge system sends repeated requests to the bot. The bot sees its own previous messages as context and responds to itself, creating a one-sided monologue.

**Fix in `supabase/functions/vibe-bot-chat/index.ts`:**
- Before generating a nudge response, check if the last N messages in chat_log are ALL from the bot. If the bot has already sent 3-4 unanswered messages, stop responding (return a "no reply" response instead of generating more text).
- Add a nudge instruction that explicitly tells the AI: "You already sent messages that went unanswered. Don't just keep talking. Either send ONE short natural follow-up or stay silent."
- Track nudge count so after 3-4 attempts, the bot goes quiet (like a real person would).

### Technical Summary

| File | Change |
|------|--------|
| `src/pages/Friends.tsx` | Prefer displayName over username; always show search bar |
| `src/pages/FriendChat.tsx` | Prefer displayName over username in header |
| `supabase/functions/direct-chat/index.ts` | Detect bot receiver, load context, generate AI reply, insert bot DM |
| `supabase/functions/vibe-bot-chat/index.ts` | Revamp persona prompt; fix self-talking with nudge limits |
| Database (data insert) | Add friendships + conversations for Queen Tapestry with remaining users |

