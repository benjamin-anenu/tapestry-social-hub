

## WhatsApp-Style Chat Experience for My Circle

### Overview
Transform the My Circle page from a static profile list into a WhatsApp-style chat interface. Each mutual friend appears as a conversation preview showing their last message and timestamp. Tapping a friend opens a full chat view with the original vibe match conversation history pre-loaded, plus the ability to continue chatting.

### Database Changes

**New table: `direct_messages`**
- `id` (uuid, PK)
- `sender_id` (uuid, references profiles.id)
- `receiver_id` (uuid, references profiles.id)
- `text` (text, max 500 chars)
- `created_at` (timestamptz)

RLS policies:
- SELECT: participants can view their own messages
- INSERT: authenticated users can send messages to mutual friends

Enable realtime on this table so messages appear instantly.

**New table: `conversations`**
- `id` (uuid, PK)
- `participant_a` (uuid)
- `participant_b` (uuid)
- `vibe_session_id` (uuid, nullable -- links to original vibe match)
- `last_message_text` (text, nullable)
- `last_message_at` (timestamptz, nullable)
- `created_at` (timestamptz)

RLS policies:
- SELECT: participants can view own conversations
- UPDATE: participants can update own conversations (for last_message fields)

This table is created automatically when a mutual vibe check happens. The `vibe_session_id` links back to the original chat history.

### Frontend Changes

**1. Redesign `src/pages/Friends.tsx` -- Chat List View**

Replace the current card-based layout with a WhatsApp-style conversation list:
- Each row shows: avatar initial, username, last message preview (truncated), and timestamp
- Online indicator dot if `is_online` is true
- Sorted by most recent message
- Clicking a row navigates to `/play/friends/:friendId`

**2. New page: Friend Chat (`src/pages/FriendChat.tsx`)**

A dedicated chat page at `/play/friends/:friendId`:
- Header with friend's name, back arrow, and profile info button
- Chat body reusing the existing `ChatZone` component pattern
- First loads the vibe match history from `vibe_sessions.chat_log` (read-only, with a visual separator like "-- Vibe Match History --")
- Then loads and displays all `direct_messages` between the two users
- Input field at bottom for sending new messages
- Realtime subscription for incoming messages

**3. Profile details drawer**

When the user taps the friend's name/info icon in the chat header, a slide-up sheet shows:
- Username, real name, location
- Social handles (X, Instagram) as tappable links
- Bio text
- "Challenge" button (disabled, showing "Coming Soon")

**4. Route addition in `App.tsx`**

Add route: `/play/friends/:friendId` pointing to `FriendChat`

### Edge Function Changes

**New edge function: `direct-chat/index.ts`**

Handles sending a direct message:
- Validates both users are mutual friends (using `is_mutual_friend` DB function)
- Inserts into `direct_messages`
- Updates `conversations.last_message_text` and `last_message_at`
- Returns success

### Challenge Button

The Challenge button moves into the profile details drawer and will be rendered as:
- Disabled state
- Label: "Challenge -- Coming Soon"
- Muted styling with a lock icon

### Data Flow

1. When a mutual vibe check occurs (in `vibe-verdict` / `vibe-bot-verdict`), a row is inserted into `conversations` with the `vibe_session_id`
2. The Friends page queries `conversations` joined with `profiles` to show the chat list
3. Opening a conversation loads: vibe match history from `vibe_sessions.chat_log` + direct messages from `direct_messages`
4. Sending a message calls the `direct-chat` edge function, which inserts into `direct_messages` and updates the conversation preview
5. Realtime subscription on `direct_messages` pushes new messages to the open chat

### Technical Details

- Reuse the existing `ChatZone` component styling for message bubbles (no clue drops needed, so pass empty array)
- The vibe match history section will have a distinct header separator so users know where the original conversation was
- Messages from the vibe session use `sender` field (wallet address or BOT ID) mapped to "you"/"them" using the current user's wallet
- Direct messages use `sender_id` (profile UUID) mapped similarly
- Conversation list sorted by `last_message_at DESC`
- Pagination: load last 50 direct messages initially, scroll-to-load-more later

