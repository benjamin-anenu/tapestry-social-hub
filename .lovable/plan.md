

## Diagnosis

The build error is completely generic — `"failed to build: "` with an empty message. The Vite config and `package.json` look clean after the PWA removal. However, there are **two potential issues**:

1. **Conflicting lockfiles**: The project root contains `bun.lockb`, `bun.lock`, AND `package-lock.json` — three lockfiles from two package managers. This can cause the build system to resolve dependencies incorrectly or pick the wrong lockfile.

2. **Missing direct dependency**: `@solana/wallet-adapter-base` is imported in `WalletProvider.tsx` but is not listed in `package.json`. It works as a transitive dependency of `@solana/wallet-adapter-react`, but during production builds with strict resolution, this can fail.

## Plan

### Step 1: Remove conflicting Bun lockfiles
Delete `bun.lockb` and `bun.lock` from the project. The build system uses npm (`package-lock.json`), so these are stale artifacts that can interfere.

### Step 2: Add missing direct dependency
Add `@solana/wallet-adapter-base` to `package.json` dependencies since it's directly imported.

| File | Change |
|------|--------|
| `bun.lockb` | Delete |
| `bun.lock` | Delete |
| `package.json` | Add `"@solana/wallet-adapter-base": "^0.9.25"` to dependencies |

