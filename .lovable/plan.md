

## Regenerate Onboarding Images with Tapestry + Solana Branding

### Overview

Replace the 5 onboarding hero images with new AI-generated images that are explicitly Tapestry and Solana branded, reflecting the demo nature of the app. Each image will be generated using the Lovable AI image generation model (google/gemini-3-pro-image-preview) via an edge function, then saved as static assets.

---

### Image Prompts (Detailed)

**Screen 1: "Your Vibe, On-Chain"**
- Split composition showing a glowing on-chain identity profile card with the Tapestry logo
- Vibe energy lines (electric blue and neon green) flowing through and around the card
- Solana logo and blockchain node constellation in the background
- Dark background (#0a0f1a), cinematic lighting, 3D hyper-realistic style
- Tapestry branding visible on the identity card

**Screen 2: "60 Seconds to Connect"**
- Divided/split-screen composition: left side shows a young woman at home on her couch, right side shows a young man at a bar
- Both facing their phones, mid-thought, trying to type a message
- Tapestry-branded identity cards floating above each person
- Solana blockchain visual elements (chains, nodes, the Solana logo) connecting the two halves
- A 60-second timer element visible between them
- 3D hyper-realistic, dark cinematic tones with electric blue and neon green accents

**Screen 3: "The Vibe Check"**
- Divided/split-screen: two people at different locations (one at a park bench, one at a coffee shop)
- Both sweating but laughing with big smiles -- the relief of a mutual match
- A "Vibe Checked" confirmation badge/button visible on both sides, glowing green
- Tapestry and Solana branding subtle in the background
- Warm, celebratory energy with neon accents

**Screen 4: "Build Your Circle"**
- Regenerate with stronger Tapestry branding: a social graph with the Tapestry logo at the center node
- Friend nodes connected with on-chain verification badges featuring Solana branding
- Portable identity concept: nodes extending outward to other app icons
- Dark background with electric blue connections

**Screen 5: "Game On"**
- Board game scene: friends gathered around a digital game board
- SOL tokens (not Bitcoin) floating above the board, with the Solana logo clearly visible
- Leaderboard hologram in the background
- Tapestry identity cards visible for each player
- Fun, competitive energy with neon lighting

---

### Architecture

**Edge function:** `supabase/functions/generate-onboarding-images/index.ts`
- POST endpoint that generates all 5 images using google/gemini-3-pro-image-preview
- Uses LOVABLE_API_KEY (auto-provisioned)
- Returns base64 images
- Each image generated with a detailed prompt as described above

**Storage:** Upload generated images to a Lovable Cloud storage bucket (`onboarding-images`, public read)

**Frontend update:** Modify `src/components/onboarding/onboardingData.ts` to reference the new storage bucket URLs instead of local asset imports

---

### Technical Details

**Files to create:**
1. `supabase/functions/generate-onboarding-images/index.ts` -- Edge function to generate images via Lovable AI

**Files to modify:**
1. `src/components/onboarding/onboardingData.ts` -- Update image references to point to storage bucket URLs, update alt text to match new image descriptions
2. `supabase/config.toml` -- Add function configuration with verify_jwt = false

**Database changes:**
- Create `onboarding-images` storage bucket (public read access)

**Implementation steps:**
1. Create the storage bucket for onboarding images
2. Build the edge function with detailed prompts for all 5 screens
3. Deploy and invoke the edge function to generate images
4. Update onboardingData.ts to load images from storage bucket URLs
5. Add fallback handling: if bucket images fail to load, show gradient placeholders
6. Remove the old static asset files (onboarding-1.png through onboarding-5.png) once bucket images are confirmed working

**Image generation model:** google/gemini-3-pro-image-preview (highest quality)

**Prompt structure for each image:**
- Style: 3D hyper-realistic, cinematic lighting, dark background (#0a0f1a)
- Colors: electric blue (#3b82f6), neon green (#22c55e) accents
- Branding: Tapestry logo/text and Solana logo/text where specified
- Aspect: landscape-leaning for mobile-first card layout
- Quality: Maximum detail, photorealistic textures

