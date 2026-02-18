

## Regenerate "60 Seconds to Connect" Onboarding Image

### What Changes

Replace the current Screen 2 image (`src/assets/onboarding-2.png`) with a new AI-generated image that conveys **intense time pressure** and urgency.

### New Image Prompt

A 3D hyper-realistic split-screen composition showing intense pressure and urgency:
- **Left side**: A young woman on her couch at home, leaning forward intensely at her phone, biting her lip, fingers hovering over the keyboard trying to think of something clever to type
- **Right side**: A young man at a dimly lit bar, hunched over his phone with visible tension, stressed but excited
- **Center**: A massive glowing countdown timer reading "0:47" in neon electric blue, pulsing with urgency -- no random numbers, just a clear countdown
- **Branding**: Tapestry-branded identity cards floating above each person, Solana blockchain chains and glowing nodes connecting the two halves
- **Energy**: The dividing line between the two halves crackles with electric energy, motion blur on edges suggesting speed and pressure
- **Style**: Dark cinematic background (#0a0f1a), dramatic lighting, electric blue (#3b82f6) and neon green (#22c55e) accents
- **Mood**: INTENSE, heart-racing, time-pressure urgency

### Technical Details

**Files to modify:**
1. `src/assets/onboarding-2.png` -- Replace with the newly generated image

**No other changes needed** -- the alt text in `onboardingData.ts` already describes this scene accurately.

**Method:** Generate the image using the Lovable AI image model (`google/gemini-3-pro-image-preview`) and save directly as the static asset.

