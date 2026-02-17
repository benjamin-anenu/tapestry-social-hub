

## Fix Amara Vibe Match — 4 Critical Bugs

### Root Cause

The app uses **wallet-based auth** (Solana), not Supabase Auth. But the RLS policies on `vibe_sessions` check `auth.uid()`, which is always NULL for anonymous/wallet users. This blocks:
- Direct database reads (initial greeting fetch)
- Realtime subscription updates (messages never arrive)
- The typing indicator never clears because it depends on Realtime

### Solution: Remove dependency on direct DB access for bot chats

Since bot chat is fully controlled (user sends message -> edge function processes -> returns response), we don't need Realtime or direct DB queries at all for bot matches. The edge function already has service role access.

---

### Fix 1: Return bot response directly from `vibe-bot-chat`

**File: `supabase/functions/vibe-bot-chat/index.ts`**

Instead of returning just `{ ok: true }`, return the bot's actual response text so the frontend can update immediately:

```json
{ "ok": true, "botReply": "Hey! What's good?" }
```

### Fix 2: Return initial greeting from `vibe-match`

**File: `supabase/functions/vibe-match/index.ts`**

Include the initial `chatLog` in the response so the frontend doesn't need to query `vibe_sessions` directly:

```json
{ "sessionId": "...", "role": "a", "partnerName": "Queen Tapestry", "isBot": true, "initialMessages": [...] }
```

Also change `partnerName` from `botProfile.display_name` to `"Queen Tapestry"` (the nickname).

### Fix 3: Rewrite frontend message handling for bot chats

**File: `src/pages/VibeMatch.tsx`**

- Remove the direct `supabase.from("vibe_sessions").select()` call for bot matches (it always fails with 406)
- Load initial messages from the `vibe-match` response's `initialMessages` field
- When sending a message to bot: optimistically add user message to state, then add bot reply from the edge function response (no Realtime needed)
- Keep the Realtime subscription only for human-vs-human matches
- Clear `isTyping` in the `handleSendMessage` callback after the edge function responds
- For nudge messages: update state from the edge function response too

### Fix 4: Prevent duplicate verdict submission

**File: `src/pages/VibeMatch.tsx`**

Add a `submittingVerdict` ref/state guard so `handleVerdict` can only fire once.

### Fix 5: Use nickname "Queen Tapestry" 

**File: `supabase/functions/vibe-match/index.ts`**

Change the bot fallback's `partnerName` from `botProfile.display_name ?? "Amara"` to `botProfile.username === "queen_tapestry" ? "Queen Tapestry" : botProfile.display_name ?? "Amara"`.

---

### Files to modify

| File | Changes |
|---|---|
| `supabase/functions/vibe-bot-chat/index.ts` | Return `botReply` text in response |
| `supabase/functions/vibe-match/index.ts` | Return `initialMessages` in response; fix partner name to nickname |
| `src/pages/VibeMatch.tsx` | Use response data instead of direct DB/Realtime for bot chats; fix double-verdict; load initial messages from response |

