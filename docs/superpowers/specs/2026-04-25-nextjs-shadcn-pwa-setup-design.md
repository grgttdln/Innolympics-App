# Next.js + shadcn/ui + Serwist PWA Skeleton

**Date:** 2026-04-25
**Status:** Approved for implementation
**Scope:** Initial project setup (skeleton only, no demo components)

## Goal

Set up a clean Next.js project that is PWA-ready from day one, with shadcn/ui installed and configured but not yet exercised. This is the foundation the rest of the Innolympics app will be built on.

## Stack

- **Next.js 15** — App Router, Turbopack, TypeScript
- **Tailwind CSS v4** — used by shadcn for styling
- **ESLint** — Next.js default config
- **shadcn/ui** — New York style, neutral base color, CSS variables, `src/` layout
- **Serwist** — service worker, manifest integration, offline fallback, runtime caching

## Project Layout

```
Innolympics-App/
├── public/
│   ├── icons/
│   │   ├── icon-192.png           # placeholder
│   │   └── icon-512.png           # placeholder
│   └── manifest.webmanifest
├── src/
│   ├── app/
│   │   ├── ~offline/
│   │   │   └── page.tsx           # offline fallback (Serwist convention)
│   │   ├── sw.ts                  # Serwist service worker entry
│   │   ├── layout.tsx             # root layout, manifest + theme-color metadata
│   │   ├── page.tsx               # barebones home page
│   │   └── globals.css
│   ├── components/
│   │   └── ui/                    # shadcn components land here (empty initially)
│   └── lib/
│       └── utils.ts               # cn() helper
├── next.config.ts                 # withSerwistInit wrapper
├── tsconfig.json                  # includes @/* path alias
├── components.json                # shadcn config
├── eslint.config.mjs
├── postcss.config.mjs
└── package.json
```

## Key Configuration

### `next.config.ts`
Wraps the Next config with `withSerwistInit` from `@serwist/next`, pointing at `src/app/sw.ts` as the service worker source and outputting to `public/sw.js`.

### `src/app/sw.ts`
Minimal Serwist worker using `defaultCache` from `@serwist/next/worker`:
- Precaches build-time assets via `self.__SW_MANIFEST`
- Runtime caching for pages, static assets, images, fonts
- `navigateFallback: "/~offline"` so failed navigations land on the offline page

### `public/manifest.webmanifest`
```json
{
  "name": "Innolympics",
  "short_name": "Innolympics",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### `src/app/layout.tsx`
Uses Next.js metadata API to declare:
- `manifest: "/manifest.webmanifest"`
- `themeColor: "#ffffff"` (via `viewport` export)
- Basic `<html lang="en">` shell with Tailwind globals

### `components.json` (shadcn)
- Style: `new-york`
- Base color: `neutral`
- CSS variables: `true`
- RSC: `true`
- Paths use `@/` alias pointing at `src/`

## Routes

- **`/`** — barebones home: app name as `<h1>`, one line of description text. No shadcn components used.
- **`/~offline`** — plain text "You're offline" message. Served by the service worker when a navigation request fails.

## Development Behavior

- Serwist disables the service worker in development by default, so HMR/Turbopack stay clean.
- `npm run build && npm start` produces a working PWA that passes Lighthouse's basic installability checks (manifest + service worker + HTTPS/localhost + icons).

## Placeholder Assets

- `public/icons/icon-192.png` and `public/icons/icon-512.png` are placeholder PNGs (solid color). Real icons to be swapped later.

## Explicitly Out of Scope

- No demo components (Button, Card, etc.) wired up
- No theme toggle / dark mode UI
- No navbar or layout chrome
- No "install PWA" prompt button
- No push notifications, background sync, or custom caching strategies beyond Serwist defaults

## Verification

Setup is complete when:
1. `npm run dev` starts the app on `localhost:3000` with no errors and the home page renders
2. `npm run build` completes successfully and emits `public/sw.js`
3. `npm start` serves the app and, in Chrome DevTools, Application → Manifest shows the parsed manifest and Application → Service Workers shows `sw.js` registered
4. Going offline in DevTools and reloading serves the `/~offline` fallback
