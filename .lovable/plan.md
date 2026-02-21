

## Fix: Input Field Repositions Above Keyboard

### What's Happening Now
The header fix works perfectly. But the keyboard height padding (`kbHeight`) is applied to the **outer container**, while the input lives **inside** the ChatZone card. The padding adds empty space below the card instead of pushing the input up above the keyboard.

### The Fix
Pass the keyboard height (`kbHeight`) into ChatZone as a prop, and apply it as `padding-bottom` directly on the **input area** inside ChatZone. This way the input bar will always sit right above the keyboard.

### Changes

**1. `src/components/demo/ChatZone.tsx`**
- Add a new `kbHeight` prop (number, defaults to 0)
- Apply `paddingBottom: kbHeight` to the input area container (the `border-t` div at the bottom)
- Also add `env(safe-area-inset-bottom)` fallback for devices with home indicators

**2. `src/pages/VibeMatch.tsx`**
- Remove `paddingBottom` from the outer fixed Layer 2 container
- Pass `kbHeight={kbHeight}` as a prop to ChatZone

**3. `src/pages/FriendChat.tsx`**
- No changes needed — it already handles keyboard padding on its own input bar correctly

### Technical Detail

```text
BEFORE (broken):
  [Fixed Layer 2 div padding-bottom: kbHeight]
    [ChatZone card h-full]
      [messages scroll]
      [input bar]        <-- hidden behind keyboard
    [empty space from padding]

AFTER (fixed):
  [Fixed Layer 2 div — no extra padding]
    [ChatZone card h-full]
      [messages scroll]
      [input bar padding-bottom: kbHeight]  <-- sits above keyboard
```
