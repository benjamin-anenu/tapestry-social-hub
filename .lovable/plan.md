

# Plan: Mobile Deposit Fix + Admin Escrow Dashboard

## Part 1: Mobile Deposit -- Use `sendTransaction` + QR Fallback

The user's analysis is correct. The current `signTransaction` + `sendRawTransaction` two-step approach doesn't reliably trigger the Mobile Wallet Adapter deep link from a PWA context. The fix uses a layered strategy:

### Strategy
1. **Desktop / In-wallet browser**: Use `sendTransaction()` from the wallet adapter (works perfectly)
2. **Mobile PWA**: Try `sendTransaction()` first (handles MWA session internally). If it fails, show a **QR code** using Solana Pay URL format that the user scans with their wallet app, then poll the backend for deposit confirmation
3. Remove the "open in wallet browser" error message entirely

### Files Changed

**`src/components/chicken/ChickenDeposit.tsx`** -- Rewrite:
- Switch from `signTransaction` back to `sendTransaction` as primary method
- Add mobile detection (`navigator.userAgent`) and in-wallet-browser detection (`window.phantom?.solana`)
- On mobile failure: serialize the transaction, generate a Solana Pay URL (`solana:<escrow>?amount=<stake>&label=...`), render a QR code via `qrcode.react`
- Poll backend every 2s (max 60 attempts / 2 min) to check if deposit landed
- Cancel button to exit QR flow
- Update error messages -- no more "open in wallet browser"

**New dependency**: `qrcode.react` -- for rendering QR codes

### No WalletProvider changes needed
The user suggested adding `SolanaMobileWalletAdapter` from `@solana-mobile/wallet-adapter-mobile`. However, the standard `sendTransaction()` on Phantom/Solflare adapters already handles MWA internally when running on mobile. Adding the explicit MWA adapter can cause conflicts. We keep the existing provider as-is and rely on the QR fallback for edge cases.

---

## Part 2: Admin Escrow Dashboard

### Backend: `admin-api` -- Add `escrow_dashboard` action
- Derive escrow public key from `ESCROW_WALLET_PRIVATE_KEY` (same base58 logic as `chicken-escrow-info`)
- Fetch live SOL balance via Solana Devnet RPC (`getBalance`)
- Query `chicken_games` where any deposit exists, joined with `profiles` for usernames
- Return `{ escrowPublicKey, balanceSol, transactions[] }`

### Frontend: `src/pages/Admin.tsx` -- Add Escrow Card
- New state `escrowData` fetched alongside dashboard
- Card with:
  - Large SOL balance display
  - Truncated escrow address + copy button
  - Scrollable transaction history table: Game ID, Players, Stake, Status, Winner, Deposit TX links, Payout TX link, Date
  - TX hashes link to Solana Explorer (devnet)

---

## Summary of Files

| File | Action |
|------|--------|
| `src/components/chicken/ChickenDeposit.tsx` | Rewrite: `sendTransaction` primary + QR fallback |
| `supabase/functions/admin-api/index.ts` | Add `escrow_dashboard` action |
| `src/pages/Admin.tsx` | Add Escrow Wallet card |
| `package.json` | Add `qrcode.react` dependency |

