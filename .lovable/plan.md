

## Improve Mobile Wallet Experience + "What is a Wallet?" Help Section

### Overview

Replace the current bare `WalletMultiButton` on the connect screen with a rich mobile-aware experience that detects the user's device, offers deep links to open Phantom/Solflare directly, and provides a collapsible "What is a wallet?" educational section.

---

### Part 1: Mobile Detection + Deep Links

**New component: `src/components/play/MobileWalletConnect.tsx`**

This component will:
1. Detect if the user is on mobile (using the existing `useIsMobile` hook)
2. Check if wallet extensions are already available in the browser (`window.phantom?.solana`, `window.solflare`)
3. Show different UIs based on context:

**Desktop users:**
- Show the standard `WalletMultiButton` (works as-is since extensions are available)
- Below it, show a subtle "Don't have a wallet?" link that expands the help section

**Mobile users with wallet app detected (inside Phantom/Solflare in-app browser):**
- Show the standard `WalletMultiButton` since it will work normally

**Mobile users without wallet detected (regular Safari/Chrome):**
- Show two branded buttons: "Open in Phantom" and "Open in Solflare"
- These use deep links to launch the wallet apps directly:
  - Phantom: `https://phantom.app/ul/browse/{current_url}` (universal link that opens the site inside Phantom's browser)
  - Solflare: `https://solflare.com/ul/v1/browse/{current_url}` (similar universal link)
- Below the buttons, show "Don't have a wallet app?" with app store links:
  - Phantom: App Store / Google Play links
  - Solflare: App Store / Google Play links

---

### Part 2: "What is a Wallet?" Help Section

**Added to `MobileWalletConnect.tsx` as a collapsible section**

Uses the existing Collapsible component from the UI library. Content includes:

- **What is a crypto wallet?** -- A brief, friendly explanation (not technical jargon): "A wallet is like your digital identity and bank account in one. It lets you sign in to apps and hold tokens."
- **Which wallet should I use?** -- Recommend Phantom (most popular) or Solflare
- **How to set up on mobile:**
  1. Download Phantom or Solflare from the App Store / Google Play
  2. Create a new wallet (save your recovery phrase!)
  3. Come back to Vibe60 and tap "Open in Phantom" or "Open in Solflare"
- **How to set up on desktop:**
  1. Install the Phantom or Solflare browser extension
  2. Create a new wallet
  3. Refresh this page and click "Connect Wallet"

---

### Part 3: Integration into Play.tsx

Replace the current connect phase content (lines 50-66 in Play.tsx) with the new `MobileWalletConnect` component. The heading and description stay the same, but the wallet connection area becomes the new smart component.

---

### Technical Details

**Deep link URLs:**
- Phantom universal link: `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}`
- Solflare universal link: `https://solflare.com/ul/v1/browse/${encodeURIComponent(window.location.href)}`

**App store links:**
- Phantom iOS: `https://apps.apple.com/app/phantom-crypto-wallet/id1598432977`
- Phantom Android: `https://play.google.com/store/apps/details?id=app.phantom`
- Solflare iOS: `https://apps.apple.com/app/solflare-solana-wallet/id1580902717`
- Solflare Android: `https://play.google.com/store/apps/details?id=com.solflare.mobile`

**Wallet detection logic:**
```typescript
const isMobile = useIsMobile();
const hasPhantom = typeof window !== 'undefined' && !!(window as any).phantom?.solana;
const hasSolflare = typeof window !== 'undefined' && !!(window as any).solflare;
const hasAnyWallet = hasPhantom || hasSolflare;
```

**Files to create:**
- `src/components/play/MobileWalletConnect.tsx` -- new smart wallet connect component

**Files to modify:**
- `src/pages/Play.tsx` -- replace `WalletMultiButton` with `MobileWalletConnect`

