

## Fix: Help Section Formatting + Mobile Keyboard Overlay in Vibe Chat

### Change 1: Left-Align "What is a wallet?" Help Section

**File:** `src/components/play/MobileWalletConnect.tsx`

The collapsible help content (lines 113-151) needs better formatting:
- Change `list-inside` to `list-outside` with left padding (`pl-5`) on the ordered lists so numbers sit cleanly outside the text
- Add `text-left` to the container to ensure all text aligns left consistently
- Add slightly more spacing between sections (`space-y-5` instead of `space-y-4`)
- Increase paragraph line height for readability

### Change 2: Mobile Keyboard Overlay for Vibe Match Chat

**Problem:** On mobile, opening the keyboard resizes the viewport (via `100dvh`), which compresses the chat area and pushes messages up awkwardly.

**Solution:** Two changes working together:

**File:** `src/pages/VibeMatch.tsx`
- Switch the outer container from `h-[100dvh]` to `h-[100vh]` with a fixed position (`fixed inset-0`) so the layout does not resize when the mobile keyboard appears
- This makes the keyboard overlay the bottom of the screen instead of shrinking the layout

**File:** `src/components/demo/ChatZone.tsx`
- Add `visualViewport` resize listener that detects when the keyboard opens on mobile
- When keyboard is detected, apply bottom padding to the input area equal to the keyboard height so the input and last message stay visible above the keyboard
- Auto-scroll to the latest message whenever new messages arrive or the keyboard opens
- Use CSS `env(safe-area-inset-bottom)` as a fallback for devices with bottom bars

---

### Technical Details

**Keyboard detection approach (ChatZone.tsx):**
```typescript
useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const onResize = () => {
    const keyboardHeight = window.innerHeight - vv.height;
    // Apply as padding to keep input above keyboard
  };
  vv.addEventListener("resize", onResize);
  return () => vv.removeEventListener("resize", onResize);
}, []);
```

**VibeMatch.tsx layout change:**
- Outer div: `fixed inset-0` instead of `h-[100dvh]` -- prevents the browser from resizing the layout when the keyboard appears

**MobileWalletConnect.tsx formatting:**
- Add `text-left` to the help container
- Change `list-decimal list-inside` to `list-decimal list-outside ml-5` for proper indentation
- These are purely visual/CSS changes

