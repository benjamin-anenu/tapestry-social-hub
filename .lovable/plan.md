

## Root Cause: `vite-plugin-pwa` Version Incompatibility

The `package.json` has `"vite-plugin-pwa": "^1.2.0"` but the project uses **Vite 5** (`"vite": "^5.4.19"`). The `vite-plugin-pwa` 1.x series requires **Vite 6**. This version mismatch causes the production build to fail silently with the generic "failed to build" errors you're seeing.

The preview works fine because the dev server is more lenient, but the publish build (`vite build`) crashes due to the incompatibility.

Previous attempts to fix this didn't persist properly in `package.json`.

## Fix

**One change — downgrade `vite-plugin-pwa` to the latest 0.x release compatible with Vite 5:**

| File | Change |
|------|--------|
| `package.json` line 71 | Change `"vite-plugin-pwa": "^1.2.0"` to `"vite-plugin-pwa": "^0.21.1"` |

This is the only change needed. After this, publishing should succeed immediately.

