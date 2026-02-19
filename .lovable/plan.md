

## Fix Mobile Keyboard Behavior and Persistent Timer

### Problem 1: Keyboard pushes entire page up
Currently, the VibeMatch chatting layout uses `h-[100dvh]` on the outer container. On mobile, when the keyboard opens, `100dvh` shrinks to the visible viewport, causing the entire page (including the chat messages area) to compress and scroll up. The user wants only the input field to stay above the keyboard, while the chat messages remain in their natural position.

### Problem 2: Timer scrolls off screen
The `GameTimer` is inside the scrollable chat layout. When the keyboard opens and compresses the view, the timer can be pushed off screen.

---

### Solution

**1. Use `h-[100vh]` (fixed) instead of `h-[100dvh]` (dynamic) for the chat phase container**

The key insight: `100dvh` *reacts* to the keyboard, shrinking the container. `100vh` stays fixed at the full screen height. Combined with the browser's native scroll-into-view behavior for focused inputs, only the input area gets pushed up by the keyboard while the rest of the page stays put.

**2. Make the timer sticky/fixed during chat**

Move the timer to a fixed position at the top of the screen (or make it a compact floating element) so it never leaves the viewport regardless of keyboard state.

---

### Changes

**File: `src/pages/VibeMatch.tsx`**

- Change the outer container from `h-[100dvh]` to `h-[100vh]` specifically during the `chatting` phase. This prevents the dynamic viewport resize from compressing the entire layout when the keyboard opens.
- Move the `GameTimer` into a sticky/fixed header bar at the top of the chat phase, outside the scrollable content area. Make it compact: a small bar with the timer count and progress, pinned to the top.

**File: `src/components/demo/ChatZone.tsx`**

- Add `position: fixed; bottom: 0;` behavior to the input area using CSS. When the keyboard opens on mobile, the browser will naturally push the fixed-bottom input above the keyboard.
- Actually, a cleaner approach: Keep the current flex layout but ensure the outer container uses `100vh` (not `100dvh`). The input section at the bottom will naturally sit at the bottom of the full viewport. When the keyboard opens, the browser scrolls the focused input into view, pushing only the input up -- the chat messages stay in their scroll position.
- Add `overflow: hidden` on the body during chat to prevent any outer scroll.

**Specific implementation:**

1. **VibeMatch.tsx chatting phase layout:**
   - Outer: `h-screen` (equivalent to `100vh`, fixed)
   - Timer: Compact sticky bar at the very top with `sticky top-0 z-20`
   - ChatZone: `flex-1 min-h-0 overflow-hidden`
   - This keeps the timer always visible at the top

2. **ChatZone.tsx input area:**
   - Keep the current `shrink-0` on the input section
   - The `flex-1 overflow-y-auto` on the messages area means only messages scroll
   - When keyboard opens with `100vh` container, the browser handles input visibility natively

3. **Timer as a compact inline element:**
   - Instead of the current full GameTimer component, render a slim inline version during vibe chat: just the time number and a thin progress bar, sitting in a sticky header
   - This ensures it never leaves the screen

### Technical Notes
- Using `100vh` instead of `100dvh` is the standard pattern used by WhatsApp Web, Telegram, etc. for chat interfaces
- The `visualViewport` API could be used as an alternative, but `100vh` is simpler and more reliable
- The timer becomes a compact sticky element (not absolutely positioned) so it flows with the layout but never scrolls away
