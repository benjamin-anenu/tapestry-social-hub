

# Find60 Pivot: From Puzzle Hunt to Social Vibe-Match Platform

## Advisory Council Assessment

### Problem Reframing

The core problem being solved is **making genuine social connections on-chain**. The current Hunter/Hunted puzzle game has too many edge cases (bot behavior, puzzle generation, role asymmetry, timing issues) and the gameplay loop doesn't naturally produce lasting user relationships. The pivot reframes the 60-second mechanic around **mutual chemistry** rather than adversarial puzzle-solving.

**Who it's for**: Solana-native users who want to expand their social graph with real people, not just follow random accounts. The 60-second constraint creates urgency and authenticity -- you can't fake a vibe.

**What success looks like**: Users regularly return to "spin the wheel" for new connections, build a genuine follower/following graph on Tapestry, and then engage friends through staked games that keep them coming back.

### Critical Challenges the Council Flags

1. **Cold start problem**: Random matching requires online users. With zero users, every match is dead. The AI bot from the current build can serve as a fallback -- but a "vibe check" with a bot is fundamentally different from the game scenario. Bots must be clearly labeled OR so convincing users don't care.

2. **Location without GPS**: You said "based on your location selected" -- this is a self-reported city/region, NOT geolocation. This is the right call. Geolocation is a privacy nightmare and technically complex. Self-selected regions keep it simple.

3. **Privacy asymmetry**: Real name and social handles are hidden until mutual vibe-check. This is sound, but the database must enforce this -- not just the frontend. RLS policies must prevent querying another user's hidden fields unless a mutual follow exists.

4. **60-second chat abuse**: Spam, harassment, inappropriate content. With wallet-connected identities there's some accountability, but you need a report mechanism and the ability to blacklist wallets.

5. **Staked games scope creep**: Ludo, Chess, and puzzles are each a full product. Recommendation: launch with the existing puzzle game repurposed as a friend-vs-friend staked game. Defer Ludo/Chess to future phases.

6. **Tapestry follow/unfollow**: The Tapestry API supports `follow` and `unfollow` actions. Mutual vibe-checks should trigger server-side Tapestry follow calls so the social graph is portable.

---

## Architecture Overview

```text
Pages & Routes
==============
/           -> Landing (updated copy, keep UI)
/play       -> Connect Wallet -> Profile Setup -> Main Hub
/play/vibe  -> 60s Vibe Match (random chat)
/play/friends -> Friends list (followers/following)
/play/arena -> Staked games with friends
/demo       -> Keep as-is
/leaderboard -> Vibe Score leaderboard
```

```text
Database Tables
===============
profiles (MODIFY)
  + real_name (text, nullable)
  + city (text, nullable)  
  + country (text, nullable)
  + x_handle (text, nullable)
  + instagram_handle (text, nullable)
  + bio_text (text, nullable)
  + is_online (boolean, default false)
  + last_seen (timestamptz)

vibe_sessions (NEW)
  id, user_a_id, user_b_id, 
  chat_log (jsonb), 
  user_a_verdict (text: 'vibe'|'nah'|null),
  user_b_verdict (text: 'vibe'|'nah'|null),
  status (waiting|active|completed),
  created_at, ended_at

friendships (NEW - cached view of Tapestry follows)
  id, follower_id, following_id, 
  mutual (boolean),
  created_at
```

```text
Edge Functions
==============
vibe-match      -> Find random online user by city, create vibe_session
vibe-chat       -> AI-free real chat relay (append to chat_log)
vibe-verdict    -> Record vibe/nah, if mutual: call Tapestry follow API
tapestry-identity -> KEEP (profile resolution)
player-chat     -> REPURPOSE for friend arena games
matchmaking     -> REPURPOSE for friend-vs-friend game matching
bot-gameplay    -> KEEP for solo practice / empty lobbies
```

---

## Phase 1: Profile Overhaul (Immediate)

**What changes:**

- Modify the `CreateTapestryProfile` component to collect: nickname (required), real name, city/country selection, X handle, Instagram handle, short bio
- Nickname is the only publicly visible field
- Real name and socials are stored encrypted-at-rest and only revealed after mutual vibe-check
- Update `profiles` table with new columns
- Add RLS policy: users can only read another user's sensitive fields (real_name, x_handle, instagram_handle) if a mutual friendship exists in the `friendships` table
- Update `IdentityCard` to show nickname + city only (no sensitive data)

**Profile setup flow:**
1. Connect wallet (existing)
2. Tapestry profile resolution (existing)
3. Extended profile form: nickname, real name, city, socials
4. Save to both `profiles` table and Tapestry profile

## Phase 2: Vibe Match System (Core Feature)

**What changes:**

- New `vibe_sessions` table with Realtime enabled
- New `vibe-match` edge function:
  - Queries `profiles` where `is_online = true` AND `city = user.city` (or country fallback) AND not already matched/friended
  - Random selection from candidates
  - Creates a `vibe_session` record
  - Returns session ID to both users via Realtime
- New `vibe-chat` edge function:
  - Appends messages to `vibe_sessions.chat_log`
  - No AI -- this is real human-to-human chat
  - Rate-limited to prevent spam (max 2 messages per second)
- Repurpose `ChatZone` component for the vibe chat UI
- 60-second `GameTimer` reused as vibe timer
- At timer end, both users see verdict screen: "Vibe Check" or "Nah, Next"

**Verdict logic (vibe-verdict edge function):**
- Both select independently
- If both select "Vibe Check":
  - Call Tapestry API to make each follow the other
  - Insert into `friendships` table with `mutual = true`
  - Reveal real names and social handles to each other
  - Celebratory animation
- If either selects "Nah":
  - Session marked completed, no follow
  - No data revealed
  - Clean exit, no negativity

**Cold start mitigation:**
- If no online users match by city, expand to country, then global
- If still no match, show "No one online right now -- try again in a bit" (honest, no fake bots for social matching)
- Optional: AI practice mode clearly labeled as "Chat with AI while waiting"

## Phase 3: Friends Hub

**What changes:**

- New `/play/friends` route showing followers/following from Tapestry
- For mutual follows: show full profile (real name, socials, city)
- For one-way follows: show nickname only
- Chat functionality between friends (reuse chat components)
- "Challenge to Game" button on each friend card

## Phase 4: Staked Friend Games

**What changes:**

- Repurpose existing `GameArena` and puzzle system for friend-vs-friend matches
- New flow: select friend -> choose game -> set stake -> play
- Start with the existing puzzle game (already built)
- Future: add Ludo, Chess as separate game modules
- SOL staking via connected wallet (devnet first)

---

## Technical Implementation Sequence

### Step 1: Database Migration
- Add columns to `profiles`: real_name, city, country, x_handle, instagram_handle, bio_text, is_online, last_seen
- Create `vibe_sessions` table with Realtime
- Create `friendships` table
- Add RLS policies enforcing privacy rules
- Add permissive SELECT on vibe_sessions for participants only

### Step 2: Profile Setup UI
- Extend `CreateTapestryProfile` with new fields
- Add city/country dropdown (use a static list, not an API)
- Update `Play.tsx` flow to require extended profile before proceeding
- Update `IdentityCard` to show only public fields

### Step 3: Main Hub Page
- Replace the current role-select lobby with a hub showing three cards:
  - "Make Friends" (vibe match)
  - "My Circle" (friends list)
  - "Game Arena" (staked games with friends)
- Keep the existing dark cyberpunk UI aesthetic

### Step 4: Vibe Match Flow
- Create `vibe-match` edge function
- Create `vibe-chat` edge function (no AI, just relay)
- Create `vibe-verdict` edge function (Tapestry follow integration)
- Build `VibeMatch` component reusing ChatZone + GameTimer
- Build `VibeVerdict` component for post-chat decision

### Step 5: Friends List
- Create `FriendsList` component fetching from Tapestry API
- Show mutual follows with revealed details
- Add "Challenge" button per friend

### Step 6: Friend Games
- Modify matchmaking to support direct friend challenges
- Reuse GameArena for puzzle games between friends
- Add stake handling

### Step 7: Update Landing Page
- Update Index.tsx copy to reflect social-first positioning
- Change "PLAY FOR REAL" to "START VIBING" or similar
- Update feature cards to reflect new value props

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Zero online users at launch | High | Expand search radius; show honest "no one online" rather than fake matches |
| Chat abuse/harassment | High | Report button, wallet blacklist via Tapestry, 60s time limit naturally constrains |
| Privacy leak of real names | Critical | Server-side RLS enforcement, not just frontend hiding |
| Scope creep with multiple games | Medium | Launch with puzzle only, add games incrementally |
| Tapestry API rate limits | Medium | Cache follower/following data in friendships table |
| Users gaming the system (fake vibes for data) | Low | Mutual consent requirement; reported accounts get blacklisted |

---

## What to Build Now vs. Defer

**Build now (Phase 1-2):**
- Extended profile with privacy fields
- Vibe match with 60s chat
- Mutual verdict + Tapestry follow
- Updated hub UI

**Defer:**
- Ludo, Chess (each is a full product)
- SOL staking (get the social loop working first on devnet)
- Leaderboard (wait for real data)
- AI practice mode for empty lobbies

**Avoid entirely:**
- Geolocation/GPS (privacy minefield, use self-reported city)
- Auto-revealing data without mutual consent
- Fake bot matches disguised as real people for social matching (acceptable for games, NOT for social connections)

