

## Diagnosis

The `vite-plugin-pwa` version in `package.json` (^0.21.2) and `package-lock.json` (0.21.2) are already correct and compatible with Vite 5. The dependency fix has been applied successfully in previous iterations, yet the build still fails with a completely generic "failed to build" error (no stack trace, no module name).

This points to the PWA plugin itself crashing during the production build (workbox asset generation, service worker compilation, or manifest injection). The dev server doesn't exercise those code paths, which is why preview works fine.

## Plan: Remove PWA from the build pipeline

Since you want to ship now, the fastest path is to remove `vite-plugin-pwa` from the Vite plugin chain so the build succeeds immediately. The app will still work perfectly — it just won't register a service worker or offer offline/install-to-home-screen functionality until PWA is re-enabled later.

### Changes

| File | What |
|------|------|
| `vite.config.ts` | Remove the `VitePWA(...)` call from the plugins array. Remove the import. |
| `package.json` | Remove `vite-plugin-pwa` from dependencies (cleanup) |
| `index.html` | Remove `<link rel="manifest" href="/manifest.webmanifest" />` (no longer generated) |

The `src/components/pwa/InstallPrompt.tsx` and `/install` route can stay — they'll just be inert since no service worker will be registered. No runtime errors.

### After shipping

Once published, PWA can be re-added by restoring the plugin with a confirmed-working configuration.

