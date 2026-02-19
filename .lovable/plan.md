

## Fix Chat Layout Overflow and Phantom Admin Access

### Problem 1: Timer and Chat Going Off-Screen

The root cause is a CSS layout conflict in `VibeMatch.tsx`:

1. The inner container (line 250) has `justify-center` which vertically centers all children. During the chatting phase, the chat content needs to stretch to fill all available space, but `justify-center` prevents `flex-1` from working correctly.
2. The `AnimatePresence` component wraps the chat `motion.div` but doesn't forward flex properties, breaking the `flex-1` chain.

**Fix in `src/pages/VibeMatch.tsx`:**
- Remove `justify-center` from the inner container during the `chatting` phase (keep it for other phases like searching, error, etc.)
- Remove `items-center` during chatting so the chat stretches full width
- Ensure the motion.div for chatting properly fills the available space with `flex-1 min-h-0`
- The `AnimatePresence` needs to be bypassed or given proper flex styling during chat

Specifically:
- Change the inner container className to conditionally apply `justify-center items-center` only when NOT in the chatting phase
- During chatting, the container should just be `flex flex-col flex-1 min-h-0` without centering

### Problem 2: Phantom Not Working on Admin Page

This is NOT a Phantom wallet adapter issue. Phantom connects fine. The problem is your `admin_wallets` database table.

- The `admin-api` edge function checks the `admin_wallets` table for the connected wallet address
- Your Phantom wallet address is likely different from your Solflare wallet address
- Only the Solflare address is in the `admin_wallets` table, so Phantom gets "Access Denied"

**Fix:** Add your Phantom wallet address to the `admin_wallets` table. This requires a simple database insert.

To find your Phantom wallet address: connect Phantom on any page (like `/play`), then note the address shown. Then we insert it into `admin_wallets`.

Alternatively, we can show the wallet address on the "Access Denied" screen so you can easily copy it and we can add it.

### Changes Summary

| File | Change |
|------|--------|
| `src/pages/VibeMatch.tsx` | Fix flex layout: remove `justify-center items-center` during chatting phase; ensure chat fills full height |
| Database | Insert Phantom wallet address into `admin_wallets` table (requires user to provide the address) |

### Technical Details

**VibeMatch.tsx inner container fix:**

Current (line 250):
```
className="relative z-10 flex w-full max-w-lg lg:max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-4 min-h-0"
```

Fixed -- conditional classes based on phase:
```
className={`relative z-10 flex w-full max-w-lg lg:max-w-2xl flex-1 flex-col px-4 py-4 min-h-0 ${
  phase === "chatting" ? "gap-0" : "items-center justify-center gap-4"
}`}
```

This ensures:
- During chatting: the container is a simple flex column that stretches. Timer sticks to top, ChatZone fills remaining space.
- During other phases (searching, countdown, feedback, result): content is centered vertically and horizontally as before.

