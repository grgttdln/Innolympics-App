# Next.js + shadcn/ui + Serwist PWA Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js 15 project with shadcn/ui initialized and Serwist configured as a PWA layer, producing a skeleton the rest of the Innolympics app will build on.

**Architecture:** App Router with `src/` directory. shadcn/ui installed (no components used yet). Serwist wraps `next.config.ts` and registers a minimal service worker at `src/app/sw.ts` that uses its default cache strategies and an offline fallback route.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, ESLint, shadcn/ui (new-york style, neutral base, CSS variables), @serwist/next.

**Verification note:** This plan does not use TDD — the work is scaffolding/config, verified by running dev server, build, and Chrome DevTools checks, not unit tests. Each task ends with an explicit manual verification step.

**Spec:** `docs/superpowers/specs/2026-04-25-nextjs-shadcn-pwa-setup-design.md`

---

## Task 1: Scaffold Next.js project into existing directory

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `public/*`
- Preserve: `.git/`, `docs/`

**Context:** `create-next-app` refuses to scaffold into a non-empty directory. The workaround is to scaffold into a temp subfolder and move files up, preserving our existing `.git` and `docs/` folders.

- [ ] **Step 1: Run create-next-app into a temp subfolder**

Run from `/Users/georgette/Desktop/Innolympics-App`:

```bash
npx --yes create-next-app@latest _scaffold \
  --typescript \
  --eslint \
  --tailwind \
  --app \
  --src-dir \
  --turbopack \
  --import-alias "@/*" \
  --use-npm \
  --no-git
```

Expected: creates `_scaffold/` with a fresh Next.js project. No prompts because all flags are supplied.

- [ ] **Step 2: Move scaffolded files to project root**

```bash
cd /Users/georgette/Desktop/Innolympics-App
# Move all regular files
mv _scaffold/.gitignore ./
mv _scaffold/package.json ./
mv _scaffold/package-lock.json ./
mv _scaffold/tsconfig.json ./
mv _scaffold/next.config.ts ./
mv _scaffold/next-env.d.ts ./
mv _scaffold/eslint.config.mjs ./
mv _scaffold/postcss.config.mjs ./
mv _scaffold/README.md ./
mv _scaffold/src ./
mv _scaffold/public ./
mv _scaffold/node_modules ./
rmdir _scaffold
```

Expected: `_scaffold/` gone, project files at root.

- [ ] **Step 3: Verify scaffolded structure**

```bash
ls -la /Users/georgette/Desktop/Innolympics-App
```

Expected output includes: `.git/`, `docs/`, `src/`, `public/`, `node_modules/`, `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`, `next-env.d.ts`, `README.md`.

- [ ] **Step 4: Verify dev server starts and home page renders**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npm run dev
```

Expected: "Ready" within a few seconds, listening on `http://localhost:3000`. Visit it in a browser — the default Next.js welcome page renders. Stop the server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
cd /Users/georgette/Desktop/Innolympics-App
git add .gitignore package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts eslint.config.mjs postcss.config.mjs README.md src public
git commit -m "chore: scaffold Next.js 15 app with TypeScript, Tailwind, App Router"
```

---

## Task 2: Initialize shadcn/ui

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/` (directory)
- Modify: `src/app/globals.css` (shadcn adds CSS variables), `package.json` (adds deps), `tsconfig.json` (may adjust paths)

- [ ] **Step 1: Run shadcn init**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npx --yes shadcn@latest init --yes --base-color neutral
```

Expected: writes `components.json`, creates `src/lib/utils.ts` with a `cn()` helper, installs `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`, updates `globals.css` with theme CSS variables. No prompts (`--yes` auto-confirms, `--base-color` is supplied).

- [ ] **Step 2: Verify components.json**

Read `components.json`. Expected contents (shadcn writes all fields; the values that matter):

```json
{
  "style": "new-york",
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true
  },
  "rsc": true,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

If any of `style`, `baseColor`, `cssVariables`, `rsc` differ, edit `components.json` to match.

- [ ] **Step 3: Create empty components/ui directory**

```bash
mkdir -p /Users/georgette/Desktop/Innolympics-App/src/components/ui
touch /Users/georgette/Desktop/Innolympics-App/src/components/ui/.gitkeep
```

Expected: `src/components/ui/.gitkeep` exists (keeps the empty dir tracked).

- [ ] **Step 4: Verify `cn()` helper exists**

Read `src/lib/utils.ts`. Expected contents (exact):

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Verify the build still succeeds**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npm run build
```

Expected: completes without errors. `.next/` is produced.

- [ ] **Step 6: Commit**

```bash
cd /Users/georgette/Desktop/Innolympics-App
git add components.json src/lib src/components src/app/globals.css package.json package-lock.json tsconfig.json
git commit -m "chore: initialize shadcn/ui (new-york, neutral, CSS variables)"
```

---

## Task 3: Install Serwist

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install @serwist/next and serwist**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npm install @serwist/next serwist
```

Expected: both added to `dependencies` in `package.json`. No errors.

- [ ] **Step 2: Verify versions recorded**

```bash
cd /Users/georgette/Desktop/Innolympics-App
grep -E '"(@serwist/next|serwist)"' package.json
```

Expected: two lines, one per package, each with a version string.

- [ ] **Step 3: Commit**

```bash
cd /Users/georgette/Desktop/Innolympics-App
git add package.json package-lock.json
git commit -m "chore: add @serwist/next and serwist dependencies"
```

---

## Task 4: Wire Serwist into next.config.ts

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace next.config.ts contents**

Overwrite `/Users/georgette/Desktop/Innolympics-App/next.config.ts` with exactly:

```ts
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {};

export default withSerwist(nextConfig);
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npx tsc --noEmit
```

Expected: no output (clean exit). If it errors on `src/app/sw.ts` not existing, that's fine — we create it in the next task. If it errors on types from `@serwist/next`, stop and report.

Note: this task intentionally does not build or boot dev — `src/app/sw.ts` doesn't exist yet, so `next build` would fail. The next task creates it, and Task 7 runs the full build.

- [ ] **Step 3: Commit**

```bash
cd /Users/georgette/Desktop/Innolympics-App
git add next.config.ts
git commit -m "feat: wrap next.config with Serwist"
```

---

## Task 5: Create service worker entry

**Files:**
- Create: `src/app/sw.ts`

- [ ] **Step 1: Create src/app/sw.ts**

Write exactly this to `/Users/georgette/Desktop/Innolympics-App/src/app/sw.ts`:

```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npx tsc --noEmit
```

Expected: no output (clean exit).

- [ ] **Step 3: Commit**

```bash
cd /Users/georgette/Desktop/Innolympics-App
git add src/app/sw.ts
git commit -m "feat: add Serwist service worker entry with default cache and offline fallback"
```

---

## Task 6: Create manifest, icons, layout metadata, home page, and offline page

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `src/app/~offline/page.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Create manifest**

Write `/Users/georgette/Desktop/Innolympics-App/public/manifest.webmanifest` with exactly:

```json
{
  "name": "Innolympics",
  "short_name": "Innolympics",
  "description": "Innolympics app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Create placeholder PWA icons**

```bash
mkdir -p /Users/georgette/Desktop/Innolympics-App/public/icons
cd /Users/georgette/Desktop/Innolympics-App/public/icons

# Generate solid-color PNGs using macOS's built-in sips via a base64-decoded PNG.
# This creates a 1x1 white PNG, then upscales to target sizes.
BASE64_WHITE_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
echo "$BASE64_WHITE_PNG" | base64 -d > _seed.png
sips -z 192 192 _seed.png --out icon-192.png
sips -z 512 512 _seed.png --out icon-512.png
rm _seed.png
ls -la
```

Expected: `icon-192.png` and `icon-512.png` both exist and are non-empty. (They are solid white placeholders; real icons will replace them later.)

- [ ] **Step 3: Replace src/app/layout.tsx**

Overwrite `/Users/georgette/Desktop/Innolympics-App/src/app/layout.tsx` with exactly:

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "Innolympics";
const APP_DESCRIPTION = "Innolympics app";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

Note: if `create-next-app` scaffolded different fonts or class names, keep this exact version — it's the current Next.js 15 default plus manifest/viewport wiring.

- [ ] **Step 4: Replace src/app/page.tsx with barebones home**

Overwrite `/Users/georgette/Desktop/Innolympics-App/src/app/page.tsx` with exactly:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-3xl font-semibold">Innolympics</h1>
      <p className="text-sm text-muted-foreground">
        Progressive Web App skeleton.
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Create offline fallback page**

Create directory and file:

```bash
mkdir -p /Users/georgette/Desktop/Innolympics-App/src/app/~offline
```

Write `/Users/georgette/Desktop/Innolympics-App/src/app/~offline/page.tsx` with exactly:

```tsx
export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground">
        Check your connection and try again.
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
cd /Users/georgette/Desktop/Innolympics-App
git add public/manifest.webmanifest public/icons src/app/layout.tsx src/app/page.tsx "src/app/~offline"
git commit -m "feat: add manifest, placeholder icons, offline page, and barebones home"
```

---

## Task 7: Gitignore service worker build artifacts

**Files:**
- Modify: `.gitignore`

**Context:** Serwist emits `public/sw.js` and `public/swe-worker-*.js` during build. These are build artifacts and should not be committed.

- [ ] **Step 1: Append Serwist artifacts to .gitignore**

Append these lines to `/Users/georgette/Desktop/Innolympics-App/.gitignore`:

```
# Serwist-generated service worker artifacts
public/sw.js
public/sw.js.map
public/swe-worker-*.js
public/swe-worker-*.js.map
public/workbox-*.js
public/workbox-*.js.map
```

- [ ] **Step 2: Commit**

```bash
cd /Users/georgette/Desktop/Innolympics-App
git add .gitignore
git commit -m "chore: gitignore Serwist-generated service worker artifacts"
```

---

## Task 8: Full build and runtime verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npm run lint
```

Expected: exits with no errors. Warnings are acceptable.

- [ ] **Step 2: Build**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npm run build
```

Expected: completes successfully. Output includes a line like `compiled successfully` and shows the `/` and `/~offline` routes in the route table.

- [ ] **Step 3: Verify service worker was emitted**

```bash
ls -la /Users/georgette/Desktop/Innolympics-App/public/sw.js
```

Expected: file exists, size > 0. If missing, Serwist is not wired correctly — stop and report.

- [ ] **Step 4: Start production server**

```bash
cd /Users/georgette/Desktop/Innolympics-App
npm start
```

Expected: "Ready" on `http://localhost:3000`. Leave it running for the next steps.

- [ ] **Step 5: Manual browser verification**

In Chrome, open `http://localhost:3000`:
- Home page shows "Innolympics" heading and the description line.
- DevTools → Application → Manifest shows the parsed manifest (name: Innolympics, icons: 192 and 512, start_url: /, display: standalone).
- DevTools → Application → Service Workers shows `sw.js` as **activated and running**.
- DevTools → Network tab, check "Offline", reload the page: the offline fallback page renders (`You're offline`).
- Uncheck "Offline", reload: home page returns.

If any of the above fails, stop and report which step failed. Otherwise, stop the server (Ctrl+C).

- [ ] **Step 6: Final sanity — verify `.git` and `docs/` survived scaffolding**

```bash
cd /Users/georgette/Desktop/Innolympics-App
ls docs/superpowers/specs/2026-04-25-nextjs-shadcn-pwa-setup-design.md
git log --oneline
```

Expected: spec file exists; git log shows the design-spec commit plus one commit per task above.

- [ ] **Step 7: No commit**

Verification-only task. Nothing to commit.

---

## Summary of commits this plan produces

1. `chore: scaffold Next.js 15 app with TypeScript, Tailwind, App Router`
2. `chore: initialize shadcn/ui (new-york, neutral, CSS variables)`
3. `chore: add @serwist/next and serwist dependencies`
4. `feat: wrap next.config with Serwist`
5. `feat: add Serwist service worker entry with default cache and offline fallback`
6. `feat: add manifest, placeholder icons, offline page, and barebones home`
7. `chore: gitignore Serwist-generated service worker artifacts`

Plus the pre-existing design-spec commit from the brainstorming step.
