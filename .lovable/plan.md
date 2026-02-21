

## Fix: Hub Card Text Still Centered on PWA

### Root Cause

The `motion.button` in `MainHub.tsx` renders as a native HTML `<button>`. Browsers apply `text-align: center` to `<button>` elements by default via the user-agent stylesheet. The `text-left` class on the inner `<span>` (line 148) doesn't reliably override this because:

1. A `<span>` is inline by default -- `text-align` is a property that affects the inline content of a **block container**, not the element itself
2. While flex items are "blockified" by the spec, some mobile PWA WebViews (especially on Android/iOS) don't consistently honor `text-align` on an inline element that happens to be a flex item
3. The inherited `text-align: center` from the `<button>` ancestor wins in these environments

### The Fix

**`src/components/play/MainHub.tsx`** -- two small changes:

1. **Add `text-left` to the `motion.button` itself** (line 123) -- this overrides the browser's default `text-align: center` at the source, so all children inherit `text-align: left`

2. **Keep `text-left` on the span** (line 148) as a safety belt, but it's the button-level fix that actually solves it

```
// Line 123 — add text-left to the button className
className={`group relative flex items-center gap-4 rounded-2xl border border-border/50 bg-card/80 p-5 text-left backdrop-blur-sm transition-all ${...}`}
```

That's it. One class addition. No other files change.

### Why This Works

- `text-left` on the `<button>` directly overrides the user-agent `text-align: center`
- All descendant text inherits `text-align: left` from the button
- Works consistently across all browsers, PWA WebViews, and standalone mode
- The existing `text-left` on the span becomes redundant but harmless

### Files Changed

| File | Change |
|------|--------|
| `src/components/play/MainHub.tsx` | Add `text-left` to the `motion.button` className (line 123) |

