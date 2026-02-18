

## Use Uploaded Image for Screen 2

### What Changes

Copy the user-uploaded image directly to `src/assets/onboarding-2.png`, replacing the current one. This is the exact image the user wants -- no regeneration needed.

### Why Images May Revert

The images are static assets imported via ES6 modules in `onboardingData.ts`. If previous changes didn't fully persist or the build cache served stale versions, it can appear as if they reverted. This direct copy approach ensures the file is definitively replaced.

### Technical Details

**Steps:**
1. Copy `user-uploads://sample.jpg` to `src/assets/onboarding-2.png` -- directly replacing the current file
2. No other code changes needed -- `onboardingData.ts` already imports from `@/assets/onboarding-2.png`

**Files modified:**
- `src/assets/onboarding-2.png` -- replaced with the uploaded image

