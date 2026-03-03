
I traced the current deposit path and the failure point is clearly on the client side, before backend verification:

- `src/components/chicken/ChickenDeposit.tsx` sends the Solana transaction first, then calls backend function `chicken-deposit`.
- The backend function logs show no `chicken-deposit` invocations during this failure window.
- The specific error (`Missing signature for public key [...]`) means the transaction payload reached send flow without a valid signer signature for the payer key.

This is usually one of two mobile wallet issues:
1) wallet adapter handoff bug (wallet never signs or returns unsigned payload), or  
2) account/session mismatch (app thinks account A is connected, wallet signs/opens with account B or stale session).

Planned implementation to make this robust:

## 1) Harden the deposit signing flow in `ChickenDeposit.tsx`
- Stop creating a separate `new Connection(...)` inside the component.
- Use wallet provider connection (`useConnection`) so signing/sending use the same RPC context as the connected wallet adapter.
- Build a fresh transaction immediately before send (no reused tx object).
- Use blockhash + lastValidBlockHeight confirmation flow (not just string signature confirmation) for deterministic confirmation behavior.

## 2) Add two-stage transaction submission strategy (mobile-safe)
- Stage A: normal send via wallet adapter `sendTransaction(...)` with explicit options.
- Stage B (automatic one-time retry): if error matches signature-missing patterns, force a wallet session refresh and retry once with a newly built transaction.
- If retry still fails, surface a specific “wallet did not sign transaction” message instead of generic failure.

This avoids infinite retries and gives a predictable fallback for flaky mobile adapter sessions.

## 3) Add signer/account consistency checks before send
- Right before building tx, verify the currently connected public key is present and stable.
- If wallet account changes during the flow, abort with a clear message to reconnect with the same account used to join the game.
- Include the connected wallet name in error output for easier support/debugging.

## 4) Improve wallet provider configuration for mobile reliability in `src/providers/WalletProvider.tsx`
- Keep current wallets, but configure adapters with explicit network where supported (especially Solflare) to reduce mobile/deeplink ambiguity.
- Keep auto-connect behavior, but handle stale-session recovery in deposit flow (instead of breaking global app behavior).

## 5) Improve user-facing error messages in `ChickenDeposit.tsx`
Replace raw cryptic RPC errors with actionable messages:
- “Wallet signature was not attached. Please open your wallet app and approve again.”
- “Connected wallet account changed. Reconnect using the same account used for this game.”
- “If this persists on mobile browser, open the game directly inside Phantom/Solflare in-app browser.”

## 6) Validation plan (end-to-end)
After implementing, test this exact matrix:

```text
Desktop:
- Phantom extension: deposit should sign once and call chicken-deposit function.

Mobile:
- Phantom in-app browser: deposit should trigger approval and succeed.
- Solflare in-app browser: same expected behavior.
- If wallet fails to sign, retry path should run once and then show actionable error.

Verification:
- Confirm chicken-deposit backend logs appear after successful signature.
- Confirm no silent stuck state on “Sending transaction...”.
```

## Files to update
- `src/components/chicken/ChickenDeposit.tsx` (primary fix: robust send/retry/error mapping)
- `src/providers/WalletProvider.tsx` (adapter config hardening)

## Expected outcome
- Deposits no longer fail silently with raw “missing signature” in common mobile cases.
- When wallet-side signing truly fails, users get precise guidance instead of ambiguous errors.
- Backend verification remains unchanged and is only reached after a valid on-chain signature.
