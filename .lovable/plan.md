

# Three Fixes: Challenge Alert in Chat, Arena Timeout, and Mobile Blockhash Bug

## 1. Add ChickenChallengeAlert to FriendChat page

**What**: Show the incoming challenge notification overlay on the FriendChat page so friends see challenges while chatting.

**Changes**:
- `src/pages/FriendChat.tsx`: Import `ChickenChallengeAlert` and render it inside the component, passing `myProfileId` and `walletAddress`. It will appear as a floating notification over the chat.

## 2. Add 30-second timeout on arena random matching

**What**: When waiting for a random opponent (not a friend challenge), start a 30-second timer. If no one joins, show "No players available" with a retry button.

**Changes**:
- `src/pages/Chicken.tsx`:
  - Add a `useEffect` that starts a 30-second timeout when entering the `waiting` phase for non-challenge games.
  - When the timeout fires, set phase back to `lobby` with an error message "No players available right now. Try again!"
  - Clear the timeout if phase changes (opponent found) or component unmounts.
  - Add a visual countdown or message in the waiting phase showing time remaining.

## 3. Fix "Transaction recent blockhash required" on mobile

**Root cause**: The `Transaction` object is created without a `recentBlockhash` and `feePayer`. On desktop, `sendTransaction` from the wallet adapter automatically fetches these. On mobile (PWA / in-app browser), some wallet adapters do NOT auto-populate the blockhash, causing the error.

**Fix**: Explicitly fetch the recent blockhash and set `feePayer` before calling `sendTransaction`.

**Changes**:
- `src/components/chicken/ChickenDeposit.tsx`:
  - After creating the `Transaction`, fetch `connection.getLatestBlockhash("confirmed")` 
  - Set `transaction.recentBlockhash = blockhash`
  - Set `transaction.feePayer = publicKey`
  - This ensures mobile wallets have all required fields

```text
Before (broken on mobile):
  const transaction = new Transaction().add(SystemProgram.transfer({...}));
  const signature = await sendTransaction(transaction, connection);

After (works everywhere):
  const transaction = new Transaction().add(SystemProgram.transfer({...}));
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = publicKey;
  const signature = await sendTransaction(transaction, connection);
```

## Files to modify

| File | Change |
|------|--------|
| `src/pages/FriendChat.tsx` | Add `ChickenChallengeAlert` component |
| `src/pages/Chicken.tsx` | Add 30s timeout in waiting phase for arena matches |
| `src/components/chicken/ChickenDeposit.tsx` | Explicitly set `recentBlockhash` and `feePayer` before `sendTransaction` |

