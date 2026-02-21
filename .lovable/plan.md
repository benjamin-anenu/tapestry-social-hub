

## Fix: Input Bar Tracks Keyboard Using Absolute + Transform (WhatsApp-style)

### Root Cause

`position: fixed; bottom: 0` on iOS Safari stays anchored to the **layout viewport**, which does NOT resize when the keyboard opens. The keyboard simply overlays on top. Our `visualViewport` listener calculates `kbHeight` correctly, but applying it as `bottom: Xpx` on a `fixed` element has no effect on iOS because the fixed reference frame hasn't changed.

### How WhatsApp/Instagram Do It

They use `position: absolute` inside a container, and reposition the input using `transform: translateY()` based on `visualViewport.height + visualViewport.offsetTop`. This bypasses the broken `fixed + bottom` behavior entirely.

### The Fix

Replace the Layer 3 input bar from `position: fixed; bottom: kbHeight` to `position: absolute; top: 0; transform: translateY(calculatedTop)`.

### Changes

**`src/pages/VibeMatch.tsx`**

1. Change the keyboard tracking `useEffect` to calculate a **top offset** instead of keyboard height:
   - `topOffset = visualViewport.height + visualViewport.offsetTop - inputBarHeight`
   - This gives the exact pixel position where the input should sit, right above the keyboard

2. Replace Layer 3 (input bar) from:
   ```
   position: fixed; bottom: kbHeight
   ```
   to:
   ```
   position: fixed; top: 0; transform: translateY(topOffset)
   ```
   Using `top: 0` + `translateY` instead of `bottom` ensures it tracks the visual viewport correctly on iOS Safari.

3. The message area (Layer 2) bottom offset will be calculated from `window.innerHeight - topOffset` to keep messages above the input.

**`src/pages/FriendChat.tsx`**

Same pattern applied: the input bar uses `position: fixed; top: 0; transform: translateY(calculatedTop)` instead of `bottom`.

### Technical Detail

```text
BEFORE (broken on iOS):
  Input: position: fixed; bottom: kbHeight
  Problem: iOS fixed elements ignore keyboard resize

AFTER (WhatsApp-style):
  Input: position: fixed; top: 0; transform: translateY(vpHeight + vpOffset - barH)
  Why it works: visualViewport.height shrinks when keyboard opens,
                so the translateY value moves the input UP automatically
```

The key calculation:
```typescript
const update = () => {
  const vv = window.visualViewport!;
  const inputBarHeight = 60; // px, fixed known height
  const top = vv.height + vv.offsetTop - inputBarHeight;
  setInputTop(top);
};
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/VibeMatch.tsx` | Replace `fixed bottom` with `fixed top-0 + translateY` for input bar; update visualViewport listener to compute top offset |
| `src/pages/FriendChat.tsx` | Same transform-based input positioning |

