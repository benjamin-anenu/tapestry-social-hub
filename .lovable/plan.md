

## Fix AI Verdict Hallucination

### Problem
The verdict AI generates feedback that doesn't match what actually happened in the conversation. For example, the user had a good chat about fashion events and Lagos, but the verdict says "you were just giving me one-word answers" -- which is factually wrong based on the chat log.

### Root Cause
The `VERDICT_SYSTEM_PROMPT` in `supabase/functions/vibe-bot-verdict/index.ts` doesn't strongly instruct the AI to ground its feedback in the actual conversation. The model defaults to generic responses instead of referencing specific messages.

### Solution

**File: `supabase/functions/vibe-bot-verdict/index.ts`**

Update the `VERDICT_SYSTEM_PROMPT` to:
1. Add explicit instructions to reference specific things the person said
2. Forbid making claims about behavior that didn't occur in the transcript
3. Require quoting or paraphrasing actual messages

Updated prompt will include rules like:
- "You MUST reference specific things the person said or did in the conversation"
- "NEVER claim they did something (e.g. gave one-word answers) if the transcript shows otherwise"
- "Quote or paraphrase at least one specific thing they said in your reason"
- "If giving a 'nah', point to specific weak moments. If giving a 'vibe', mention what specifically impressed you"

Also update the tool description for the `reason` field to reinforce: "Must reference specific things from the conversation. Never fabricate claims about what happened."

### Additional Fix
Update the user prompt that sends the chat summary to explicitly say: "IMPORTANT: Your reason MUST only reference things that actually appear in this transcript. Do not invent or assume anything that is not shown above."

### Technical Details
- Only the edge function file changes
- Redeploy `vibe-bot-verdict` after updating
- No frontend or database changes needed

