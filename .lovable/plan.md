

## Unify Wallet Connect Screen Across All Devices

### What changes

**File:** `src/components/play/MobileWalletConnect.tsx`

1. **Show `WalletMultiButton` on ALL devices** -- Remove the mobile-specific branching that shows separate "Open in Phantom" / "Open in Solflare" buttons. Every device (mobile, tablet, desktop) will see the same standard wallet select button.

2. **Move "Don't have a wallet app?" section inside the "What is a wallet?" collapsible** -- The app store download links (Phantom iOS/Android, Solflare iOS/Android) will be placed at the bottom of the collapsible help content, after the setup instructions. This way users read the educational content first and then see download links right where they need them.

3. **Remove unused code** -- The deep link constants (`PHANTOM_DEEP_LINK`, `SOLFLARE_DEEP_LINK`), `useIsMobile` import, and wallet detection logic (`hasPhantom`, `hasSolflare`, `hasAnyWallet`, `showStandardButton`) will all be removed since they are no longer needed.

### Resulting layout (all devices)

```text
+----------------------------------+
|      [Select Wallet Button]      |
|                                  |
|   > What is a wallet?            |
|   (collapsible, when expanded:)  |
|   - What is a crypto wallet?     |
|   - Which wallet should I use?   |
|   - Setup on Mobile (steps)      |
|   - Setup on Desktop (steps)     |
|   - Don't have a wallet app?     |
|     [Phantom iOS] [Phantom And.] |
|     [Solflare iOS] [Solflare A.] |
+----------------------------------+
```

### Technical details

- Remove imports: `useIsMobile`, `ExternalLink`
- Remove constants: `PHANTOM_DEEP_LINK`, `SOLFLARE_DEEP_LINK`
- Keep: `APP_LINKS` object (still used for download links inside collapsible)
- Replace the conditional render (`showStandardButton ? ... : ...`) with just `<WalletMultiButton />`
- Move the "Don't have a wallet app?" block (with its 4 download buttons) to the end of the `CollapsibleContent`, after the Desktop setup section
- Update mobile setup step 3 from "tap Open in Phantom" to "tap Select Wallet above"

