

## Fix: Mobile Wallet Not Opening for Transaction Signing

### Problem
The current deposit flow uses `sendTransaction(transaction, connection)` which bundles signing + sending into one call. On mobile, the Mobile Wallet Adapter often fails to trigger the deep link that opens the wallet app for approval. This is why **connecting** works (it uses a different adapter method that triggers the deep link) but **depositing** does not.

### Solution
Switch from `sendTransaction` to `signTransaction` + `sendRawTransaction` -- the same two-step pattern that the wallet connect flow uses internally. This explicitly triggers the wallet's deep link/popup for signing, then sends the already-signed transaction separately.

### Changes

**File: `src/components/chicken/ChickenDeposit.tsx`**

1. Pull `signTransaction` from `useWallet()` instead of (or alongside) `sendTransaction`
2. Replace the `attemptSend` logic:
   - Build the transaction (unchanged)
   - Call `signTransaction(transaction)` -- this is the call that opens the wallet app on mobile for approval
   - Send the signed result via `connection.sendRawTransaction(signedTx.serialize())`
   - Confirm with blockhash/lastValidBlockHeight (unchanged)
3. Update the guard check in `handleDeposit` to check for `signTransaction` availability
4. Keep the retry logic and humanized error messages as-is

### Technical Detail

```text
BEFORE (broken on mobile):
  sendTransaction(tx, connection)  -->  adapter tries to sign+send internally
                                        mobile deep link often fails silently

AFTER (fix):
  signTransaction(tx)              -->  triggers wallet app open / approval popup
  connection.sendRawTransaction()  -->  sends the already-signed bytes to RPC
```

This is a minimal, targeted change -- only the send method in `attemptSend` changes. All retry logic, error handling, backend verification, and UI remain identical.

