

## Make Vibe60 a Progressive Web App (PWA)

This plan will turn Vibe60 into an installable PWA that users can add to their phone's home screen -- just like a native app. It loads fast, works offline (for cached pages), and shows up with your app icon and splash screen.

### What You'll Get

- An "Install" prompt/button so users can add the app to their home screen
- A custom app icon and splash screen when launching
- Fullscreen, standalone experience (no browser chrome)
- Offline fallback page when there's no internet
- The app can later be packaged for Google Play / Microsoft Store / iOS App Store using PWABuilder.com

---

### Step 1: Install the Vite PWA Plugin

Add the `vite-plugin-pwa` package, which handles generating the service worker and web manifest automatically during the build.

### Step 2: Configure PWA in `vite.config.ts`

Add the `VitePWA` plugin with the following configuration:

- **registerType: "autoUpdate"** -- the service worker updates automatically in the background
- **includeAssets** -- precache the favicon and placeholder image
- **manifest** -- the web app manifest with:
  - `name`: "Vibe60 -- The Most Interesting Minute of Your Day"
  - `short_name`: "Vibe60"
  - `description`: The app tagline
  - `theme_color`: "#0a0f1a" (matches the dark background)
  - `background_color`: "#0a0f1a"
  - `display`: "standalone" (no browser UI)
  - `scope`: "/"
  - `start_url`: "/"
  - `icons`: Array of PNG icons at 192x192 and 512x512 sizes
- **workbox.navigateFallbackDenylist** -- exclude `/~oauth` from the service worker cache (required for auth redirects to work)

### Step 3: Create PWA Icons

Create two icon files in `public/`:
- `pwa-192x192.png` (192x192)
- `pwa-512x512.png` (512x512)

These will be SVG-based icons with the Vibe60 branding (electric blue/neon green on dark background with "V60" text). For production, you should replace these with proper designed PNG icons.

### Step 4: Create an Offline Fallback Page

Create `public/offline.html` -- a simple styled page that shows when the user is offline and tries to access a page that isn't cached. Matches the Vibe60 dark theme.

### Step 5: Update `index.html` with PWA Meta Tags

Add to the `<head>`:
- `<meta name="theme-color" content="#0a0f1a">` -- sets the browser/status bar color
- `<link rel="apple-touch-icon" href="/pwa-192x192.png">` -- iOS home screen icon
- `<link rel="manifest" href="/manifest.webmanifest">` -- link to the generated manifest (vite-plugin-pwa generates this, but adding the link ensures compatibility)

### Step 6: Create an Install Prompt Component

Build a `src/components/pwa/InstallPrompt.tsx` component that:
- Listens for the browser's `beforeinstallprompt` event
- Shows a styled banner/button inviting the user to install the app
- On iOS (where `beforeinstallprompt` isn't supported), shows instructions: "Tap Share then Add to Home Screen"
- Dismisses after the user installs or closes the prompt
- Saves dismissal to localStorage so it doesn't keep reappearing

### Step 7: Add Install Prompt to the App

Import and render `<InstallPrompt />` in `src/App.tsx` so it appears on all pages.

### Step 8: Create a Dedicated `/install` Page

Create `src/pages/Install.tsx` with:
- Step-by-step visual instructions for installing on iOS and Android
- A manual "Install" button that triggers the install prompt
- Links to explain what a PWA is
- Add the route to `App.tsx`

---

### After Implementation: Publishing to App Stores (Optional Future Step)

Once the PWA is live at `find60.lovable.app`, you can use **PWABuilder.com** to package it:

1. Go to pwabuilder.com and enter `https://find60.lovable.app`
2. PWABuilder validates your manifest, service worker, and security
3. Click "Package" and choose your target: Google Play, Microsoft Store, or iOS App Store
4. Download the package and submit to the respective store

This requires developer accounts ($25 one-time for Google Play, $19 for Microsoft, $99/year for Apple).

---

### Technical Details

**Files to create:**
1. `public/pwa-192x192.png` -- App icon (192x192)
2. `public/pwa-512x512.png` -- App icon (512x512)
3. `public/offline.html` -- Offline fallback page
4. `src/components/pwa/InstallPrompt.tsx` -- Install prompt component
5. `src/pages/Install.tsx` -- Dedicated install page

**Files to modify:**
1. `vite.config.ts` -- Add VitePWA plugin configuration
2. `index.html` -- Add PWA meta tags (theme-color, apple-touch-icon)
3. `src/App.tsx` -- Add InstallPrompt component and /install route

**Dependencies to install:**
- `vite-plugin-pwa`

**Key config snippet (vite.config.ts):**
```typescript
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
    workbox: {
      navigateFallbackDenylist: [/^\/~oauth/],
    },
    manifest: {
      name: 'Vibe60 — The Most Interesting Minute of Your Day',
      short_name: 'Vibe60',
      theme_color: '#0a0f1a',
      background_color: '#0a0f1a',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  }),
]
```

