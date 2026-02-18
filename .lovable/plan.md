

## Fix: Professional Mobile Chat Keyboard Experience

### Problem

The current approach fights the browser's natural keyboard behavior. It uses `fixed inset-0` (which ignores the keyboard) and then tries to manually detect the keyboard height via `visualViewport` to add padding. This is fragile and doesn't work reliably across devices.

Professional chat apps (WhatsApp, Instagram, ChatGPT) work differently -- they let the browser naturally resize the layout when the keyboard opens.

### Solution: Work WITH the browser, not against it

The fix is simple and involves removing complexity, not adding it.

---

### Change 1: VibeMatch.tsx -- Use `dvh` instead of `fixed inset-0`

Replace `fixed inset-0` with `h-[100dvh]` on the outer container.

- `100dvh` (dynamic viewport height) is a CSS unit that automatically shrinks when the mobile keyboard opens
- This means the entire layout naturally compresses to fit the visible area above the keyboard
- The flex layout ensures the input stays at the bottom of the visible area and the messages area shrinks
- No manual keyboard detection needed

### Change 2: ChatZone.tsx -- Remove all keyboard hacks

Strip out:
- The `keyboardPadding` state
- The `visualViewport` resize/scroll listener
- The dynamic `paddingBottom` style on the input container

These are no longer needed because `100dvh` handles everything automatically.

Keep:
- The `scrollToBottom` on new messages (already works)
- The `onFocus` scroll on the input (ensures latest message is visible when you tap the input)
- The `text-base` font size on the input (prevents iOS auto-zoom on inputs smaller than 16px)

### Change 3: FriendChat.tsx -- Same treatment

Replace `h-screen` with `h-[100dvh]` so the direct message chat also works properly with mobile keyboards.

---

### Why this works

On mobile browsers:
- `100vh` = full viewport including area behind keyboard (bad -- keyboard covers content)
- `fixed inset-0` = same problem as 100vh
- `100dvh` = viewport minus keyboard height (good -- content reshapes to fit)

This is exactly what WhatsApp, iMessage, and ChatGPT web do. The layout naturally adapts, the input stays visible, and messages scroll to show the latest one.

---

### Technical Details

**Files to modify:**

1. `src/pages/VibeMatch.tsx` (line 230): Change `fixed inset-0` to `h-[100dvh]`
2. `src/components/demo/ChatZone.tsx`: Remove `keyboardPadding` state, remove `visualViewport` effect (lines 30, 50-66, 157), remove dynamic padding style
3. `src/pages/FriendChat.tsx` (line 231): Change `h-screen` to `h-[100dvh]`

Net result: ~20 lines of code removed, 2 class name changes. Simpler and more reliable.

