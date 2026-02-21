

## Fix: Enable Visual Viewport Resizing for Keyboard Tracking

### What Changes
One single change in `index.html` — swap `interactive-widget=overlays-content` to `interactive-widget=resizes-visual`.

### Why This Works
- `overlays-content` tells the browser: "keyboard overlays on top, don't resize anything" — this is why the existing `visualViewport` tracking code produces no movement
- `resizes-visual` tells the browser: "shrink the visual viewport from the bottom when the keyboard opens"
- The shrink happens **only from the bottom** — the top edge of the viewport stays at 0, so the header (fixed at top-0) is completely unaffected
- Chat messages stay in place and only scroll when new messages arrive — the visible chat area just gets slightly shorter
- The input bar's `translateY(vv.height + vv.offsetTop - 60)` finally produces a different (smaller) value when the keyboard opens, moving it up

### What Does NOT Change
- Header position (fixed top-0) — untouched
- Chat message behavior — no jumping, no re-layout
- Any existing scroll behavior — messages only scroll on new messages
- `VibeMatch.tsx` — no code changes needed
- `FriendChat.tsx` — no code changes needed

### File Changed

| File | Change |
|------|--------|
| `index.html` | In the viewport meta tag, replace `interactive-widget=overlays-content` with `interactive-widget=resizes-visual` |

### Visual Explanation

```text
Keyboard closed:
  ┌─────────────────┐ ← top (0)
  │     HEADER      │ ← fixed top-0 (never moves)
  ├─────────────────┤
  │                 │
  │   CHAT AREA     │
  │                 │
  ├─────────────────┤
  │   INPUT BAR     │ ← translateY = viewport height - 60
  └─────────────────┘ ← bottom

Keyboard open (resizes-visual):
  ┌─────────────────┐ ← top (0) — SAME
  │     HEADER      │ ← SAME — not affected
  ├─────────────────┤
  │   CHAT AREA     │ ← shorter visible area, no jump
  ├─────────────────┤
  │   INPUT BAR     │ ← translateY = SMALLER viewport height - 60
  ├─────────────────┤
  │                 │
  │    KEYBOARD     │ ← viewport shrinks from here
  │                 │
  └─────────────────┘
```

