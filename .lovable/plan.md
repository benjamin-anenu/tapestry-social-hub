

## Fix: Sticky Header Bars During Keyboard Pop-up

### Problem
The "Vibing with Queen Tapestry / 52s" timer bar and the "COMMS" header inside ChatZone shift or get pushed around when the mobile keyboard opens. The user wants these headers to stay pinned in place regardless of keyboard state.

### Changes

**1. `src/pages/VibeMatch.tsx` (line 303)**
Make the timer bar `sticky top-0` so it pins to the top of the chat container and never moves when the keyboard appears or content scrolls:

```
sticky top-0 z-20 flex items-center gap-3 border-b border-border/30 bg-card/90 backdrop-blur-sm px-3 py-2
```

**2. `src/components/demo/ChatZone.tsx` (line 200)**
Make the COMMS header `sticky top-0` so it stays pinned at the top of the ChatZone container:

```
sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3 bg-card/80 backdrop-blur-sm
```

The key addition is `sticky top-0` on both headers plus ensuring they have a background (`bg-card/...` + `backdrop-blur-sm`) so content scrolls cleanly underneath them. Both already have backgrounds, so we just need the sticky positioning.

### Why This Works
- `sticky top-0` keeps the element pinned at the top of its scroll container
- The chat container already uses `overflow-y-auto` on the message area, so sticky headers won't interfere with scrolling
- Since the outer container uses `fixed inset-0` during chatting phase, the headers remain independent of keyboard behavior

### Files Changed

| File | Change |
|------|--------|
| `src/pages/VibeMatch.tsx` | Add `sticky top-0` to timer bar div (line 303) |
| `src/components/demo/ChatZone.tsx` | Add `sticky top-0 z-10 bg-card/80 backdrop-blur-sm` to COMMS header (line 200) |

