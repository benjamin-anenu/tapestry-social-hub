

## Premium PWA Onboarding Experience

### Overview

Build a 5-screen onboarding flow that appears on first app launch (tracked via `localStorage`). Each screen tells a chapter of the Vibe60 story from a Web3 perspective, with AI-generated 3D hyper-realistic hero images, smooth swipe/tap navigation, and responsive design for all PWA screen sizes.

---

### The 5 Screens (Story Arc)

**Screen 1: "Your Vibe, On-Chain"**
- Hero image: A luminous digital identity crystal floating in deep space, connected by glowing neural threads to a Solana blockchain constellation
- Copy: Introduces the concept -- your social identity lives on-chain via Tapestry on Solana. Portable, permanent, yours.
- Key message: "Connect your wallet. Own your identity."

**Screen 2: "60 Seconds to Connect"**
- Hero image: Two holographic avatars facing each other across a neon-lit arena, a 60-second timer orbiting between them like a ring of light
- Copy: Explains the core Vibe Match mechanic -- get matched with a stranger, chat for 60 seconds, decide if you vibe.
- Key message: "One minute. Real conversations. No algorithms."

**Screen 3: "The Vibe Check"**
- Hero image: A dramatic split-screen moment -- two hands reaching toward each other through a portal of electric blue and neon green energy, symbolizing mutual reveal
- Copy: If both say "Vibe" -- real names, socials, and profiles unlock. No match? Nothing shared. Privacy by design.
- Key message: "Mutual consent unlocks real connections."

**Screen 4: "Build Your Circle"**
- Hero image: A futuristic social graph visualization -- interconnected nodes of friends orbiting a central profile, each connection glowing with on-chain verification badges
- Copy: Your friends live on Tapestry's open social graph. Portable across every app in the ecosystem. Your circle grows with every vibe.
- Key message: "Friends on-chain. Portable everywhere."

**Screen 5: "Game On"**
- Hero image: An epic arena scene -- friends facing off in a staked game, SOL tokens floating in the air, a leaderboard hologram rising behind them
- Copy: Challenge your circle to staked games. Climb the ranks. Earn together. The Game Arena is where vibes become victories.
- Key message: "Play with friends. Win together."

---

### Architecture

**New files:**
1. `src/components/onboarding/OnboardingFlow.tsx` -- Main container with state management, swipe navigation, and screen transitions
2. `src/components/onboarding/OnboardingScreen.tsx` -- Reusable screen component (image, title, subtitle, body, indicators, CTA)
3. `src/components/onboarding/onboardingData.ts` -- Screen content data (titles, descriptions, image references)
4. `supabase/functions/generate-onboarding-images/index.ts` -- Edge function to generate 3D hyper-realistic images using Lovable AI (Gemini image model)
5. `src/hooks/useOnboarding.ts` -- Hook to check/set onboarding completion state

**Modified files:**
1. `src/App.tsx` -- Wrap the router with onboarding gate logic

---

### Technical Implementation

**Onboarding Gate (App.tsx):**
- Check `localStorage` for `vibe60-onboarding-complete`
- If not found, render `<OnboardingFlow />` instead of the router
- On completion, set the flag and render the normal app

**OnboardingFlow Component:**
- Uses `useState` for current screen index (0-4)
- Framer Motion `AnimatePresence` for screen transitions (fade + slide)
- Touch swipe detection via pointer events (swipe left = next, swipe right = prev)
- Dot indicators showing progress
- "Skip" button on screens 1-4
- "Get Started" CTA on the final screen
- Responsive: full `h-[100dvh]` layout, image scales proportionally, text adjusts for mobile/tablet/desktop

**Image Generation:**
- Create an edge function that calls the Lovable AI image generation endpoint (`google/gemini-3-pro-image-preview` for highest quality)
- Generate 5 images with detailed prompts matching each screen's story
- Upload generated images to a Lovable Cloud storage bucket
- The onboarding component loads images from the storage bucket URLs
- Fallback: If images haven't been generated yet, show a gradient placeholder with the screen's icon

**Responsive Design (all PWA sizes):**
- Mobile (320-414px): Image takes ~45% height, text below with larger touch targets
- Tablet (768-1024px): Image takes ~50% height, centered layout with more whitespace
- Desktop (1024px+): Side-by-side layout option or centered with max-width constraint
- All use `100dvh` for proper keyboard/notch handling
- Safe area padding for notched devices (`env(safe-area-inset-*)`)

**Screen Component Layout:**
```text
+----------------------------------+
|         [Skip]          (1/5)    |
|                                  |
|     +----------------------+     |
|     |                      |     |
|     |    3D Hero Image     |     |
|     |    (aspect 16:10)    |     |
|     |                      |     |
|     +----------------------+     |
|                                  |
|     SCREEN TITLE                 |
|     Subtitle / tagline           |
|                                  |
|     Body paragraph text          |
|     explaining the feature       |
|                                  |
|        o  o  [o]  o  o           |
|                                  |
|     [    Next / Get Started  ]   |
+----------------------------------+
```

**Swipe Navigation:**
- Track `onPointerDown` / `onPointerUp` x-coordinates
- If delta > 50px left, advance; if delta > 50px right, go back
- Keyboard: ArrowLeft/ArrowRight support for desktop

**Storage Bucket:**
- Create a `onboarding-images` storage bucket (public read)
- Store generated images as `screen-1.png` through `screen-5.png`

**Edge Function (generate-onboarding-images):**
- POST endpoint, admin-only (checks for a simple secret or admin auth)
- Calls Lovable AI with `google/gemini-3-pro-image-preview` model and `modalities: ["image", "text"]`
- Detailed prompts for each screen specifying: 3D hyper-realism, dark background matching the app's `#0a0f1a` theme, electric blue and neon green accent colors, cinematic lighting
- Uploads each result to the storage bucket
- Returns the public URLs

**localStorage Key:** `vibe60-onboarding-complete` = `"true"`

---

### Edge Cases Handled

- **Returning users**: localStorage check skips onboarding entirely
- **Cleared storage**: User sees onboarding again (acceptable -- it's a brief, informative experience)
- **Slow image loading**: Skeleton shimmer placeholder while images load; gradient fallback if fetch fails
- **Screen rotation**: `100dvh` + flex layout adapts automatically
- **Accessibility**: All images have descriptive alt text; dot indicators have aria-labels; keyboard navigation supported
- **PWA standalone mode**: Works identically whether opened in browser or as installed PWA
- **No network**: If images fail to load from storage, show styled gradient placeholders with Lucide icons (graceful degradation)

---

### Database Changes

**New storage bucket:**
- `onboarding-images` (public read, admin write)
- RLS: Public SELECT, authenticated INSERT/UPDATE/DELETE restricted to service role

---

### Implementation Order

1. Create the `useOnboarding` hook (localStorage check)
2. Create `onboardingData.ts` with screen content
3. Build `OnboardingScreen.tsx` (single screen component)
4. Build `OnboardingFlow.tsx` (navigation, swipe, transitions)
5. Gate `App.tsx` with onboarding check
6. Create storage bucket for images
7. Build and deploy the image generation edge function
8. Generate the 5 images and upload to storage
9. Connect the onboarding screens to the stored image URLs

