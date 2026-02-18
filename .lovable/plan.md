

## Two Improvements

### 1. Admin Portal: Expanded User Details

**Problem**: The user table only shows username, wallet, vibe score, last seen, and online status. You want to see all user information.

**Solution**: Add an expandable row detail panel. Click any user row to reveal their full profile: real name, country, city, X handle, Instagram handle, bio, display name, tapestry ID, games played/won, and registration date.

**Changes**:

- **`supabase/functions/admin-api/index.ts`**: Expand the `select` query on profiles to include all columns: `real_name`, `display_name`, `country`, `city`, `x_handle`, `instagram_handle`, `bio_text`, `tapestry_id`, `games_played`, `games_won`, `avatar_url`, `find_score`, `hide_score`.

- **`src/pages/Admin.tsx`**:
  - Update the `DashboardData` user interface to include all new fields.
  - Add `expandedUserId` state to track which row is expanded.
  - Make each table row clickable — clicking toggles a detail panel below that row.
  - The detail panel shows a two-column grid of all profile fields: real name, display name, country/city, X handle, Instagram handle, bio, tapestry ID, games played, games won, find/hide scores, and joined date.
  - Fields that are null show a dash.

### 2. Mobile Vibe Chat: Fix Keyboard UX

**Problem**: On mobile, when the keyboard opens it pushes the chat content up and sometimes triggers zoom, making the experience unusable. Users have to dismiss the keyboard just to press send.

**Root causes**:
- The page uses `min-h-screen` which fights with mobile viewport resizing when the keyboard appears.
- The chat container has a fixed pixel height (`h-[350px]`) that doesn't adapt.
- The input field font size is too small (`text-xs` = 12px), which triggers iOS auto-zoom on inputs under 16px.
- No `dvh` (dynamic viewport height) usage, so the layout doesn't respond to keyboard appearance.

**Solution**: Restructure the vibe chat layout to use `dvh` units and a flex column that naturally adapts when the mobile keyboard appears, and fix the zoom trigger.

**Changes**:

- **`src/pages/VibeMatch.tsx`** (chatting phase layout):
  - Change outer container from `min-h-screen` to `h-[100dvh]` with `overflow-hidden` to lock the viewport.
  - Remove the fixed `h-[350px]` on the chat container — let it flex-fill the available space using `flex-1 min-h-0`.
  - This way, when the keyboard opens, the browser shrinks `dvh` and the chat naturally compresses without pushing content off-screen.

- **`src/components/demo/ChatZone.tsx`** (input area):
  - Change input font size from `text-xs` to `text-base` (16px) to prevent iOS auto-zoom on focus, but keep it visually compact with appropriate padding.
  - Add a send-on-enter that works seamlessly (already exists, but ensure the input doesn't blur on send so users can keep typing).
  - Make the send button larger on mobile (h-10 w-10) for easier tap targets.
  - Add `autoComplete="off"` and `autoCorrect="off"` attributes to prevent mobile browser interference.

- **`src/index.css`** (global mobile fix):
  - Add a meta viewport override via CSS to ensure `maximum-scale=1` behavior: `@supports` rule with `touch-action: manipulation` on inputs to prevent double-tap zoom.
  - Add `input { font-size: 16px !important; }` media query for small screens to universally prevent zoom.

- **`index.html`**:
  - Update the viewport meta tag to include `maximum-scale=1, user-scalable=no` to prevent zoom on input focus (standard for app-like mobile experiences).

### Technical Summary

| File | Change |
|------|--------|
| `supabase/functions/admin-api/index.ts` | Expand profile select to all columns |
| `src/pages/Admin.tsx` | Add expandable row detail, update types |
| `src/pages/VibeMatch.tsx` | Use `100dvh`, flex layout, remove fixed height |
| `src/components/demo/ChatZone.tsx` | Input font 16px, larger send button, mobile-safe attrs |
| `index.html` | Add `maximum-scale=1, user-scalable=no` to viewport meta |

