

## Restructure: Fully Detached Header + Two-Layer Layout

### Why Previous Attempts Failed

The header and chat body are currently inside the same `div`. When the mobile keyboard opens, the browser resizes the entire container (including the header) as one unit. No amount of `sticky`, `lockedHeight`, or `overflow: hidden` can stop this because the browser treats the whole container as a single resizable surface.

### The Fix: Two Independent Fixed Layers

Split the chat screen into **two completely separate fixed-position elements** so the browser literally cannot move the header when resizing for the keyboard.

```text
+----------------------------------+
| FIXED LAYER 1: Header (z-50)    |  <-- position: fixed; top: 0
| "Vibing with Queen Tapestry 52s" |      Never moves. Ever.
+----------------------------------+
| FIXED LAYER 2: Chat body         |  <-- position: fixed; top: headerH
|                                  |      This is what resizes
|   [scrollable messages]          |
|                                  |
|   [input bar at bottom]          |
+----------------------------------+
| KEYBOARD (browser-controlled)    |  <-- overlaps layer 2 from bottom
+----------------------------------+
```

The header is a **sibling** of the chat body, not a child. The keyboard can only affect the viewport below the header.

### Changes

**1. `index.html`** -- Re-add `interactive-widget=overlays-content` to viewport meta. This tells modern browsers to overlay the keyboard instead of resizing the layout. Combined with the structural fix, this covers both old and new browser behavior.

**2. `src/pages/VibeMatch.tsx`** (chatting phase only)
- Remove `lockedHeight` state and its `useEffect`
- During chatting phase, render **two sibling fixed divs** instead of one wrapper:
  - Header: `fixed top-0 left-0 right-0 z-50 h-11` (timer bar)
  - Body: `fixed top-11 left-0 right-0 bottom-0` (ChatZone)
- Add `visualViewport` listener that tracks keyboard height and applies `padding-bottom` to the body container so the input stays visible above the keyboard

**3. `src/components/demo/ChatZone.tsx`**
- Remove the internal "COMMS" sticky header (it's now redundant since the parent provides the fixed header)
- The component becomes just: messages scroll area + input bar
- No structural changes to the input area itself

**4. `src/pages/FriendChat.tsx`** (Circle Chat)
- Same two-layer split: header becomes `fixed top-0 z-50`, chat body becomes `fixed top-[header] bottom-0`
- Add the same `visualViewport` listener for keyboard-aware padding

### Technical Details

The `visualViewport` listener adjusts the body's bottom padding:

```typescript
useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const update = () => {
    const kbHeight = window.innerHeight - vv.height;
    document.documentElement.style.setProperty(
      '--kb-height', `${Math.max(0, kbHeight)}px`
    );
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
    document.documentElement.style.removeProperty('--kb-height');
  };
}, []);
```

The input container uses `padding-bottom: var(--kb-height, 0px)` to stay above the keyboard.

### Files Changed

| File | Change |
|------|--------|
| `index.html` | Add `interactive-widget=overlays-content` to viewport meta |
| `src/pages/VibeMatch.tsx` | Split chatting phase into two fixed layers; add visualViewport listener; remove lockedHeight |
| `src/components/demo/ChatZone.tsx` | Remove internal COMMS header (now provided by parent) |
| `src/pages/FriendChat.tsx` | Split into two fixed layers; add visualViewport listener |

