# Innolympics — PWA Setup

## Stack

- **Next.js 16.2.4** — App Router, TypeScript, `src/` directory, `@/*` alias
- **Tailwind CSS v4** — CSS-first config (no `tailwind.config.ts`)
- **shadcn/ui** — `base-nova` preset, neutral base color, CSS variables
- **Serwist 9.5.7** (`@serwist/next`) — service worker, runtime caching, offline fallback
- **Neon + Drizzle** — Postgres backend (separate from PWA setup)

## Directory layout

```
Innolympics-App/
├── public/
│   ├── icons/
│   │   ├── icon-192.png              # placeholder (solid white)
│   │   └── icon-512.png              # placeholder (solid white)
│   ├── manifest.webmanifest          # PWA manifest
│   └── sw.js                         # emitted by Serwist (gitignored)
├── src/
│   ├── app/
│   │   ├── ~offline/page.tsx         # offline fallback (Serwist convention)
│   │   ├── sw.ts                     # Serwist worker entry
│   │   ├── layout.tsx                # metadata, manifest link, Geist fonts
│   │   ├── page.tsx                  # barebones home
│   │   ├── globals.css               # Tailwind + shadcn Nova tokens
│   │   ├── favicon.ico
│   │   └── api/                      # (backend routes)
│   ├── components/ui/                # shadcn components land here
│   └── lib/
│       ├── utils.ts                  # cn() helper
│       └── db/                       # (Drizzle schema + client)
├── drizzle/                          # (migrations)
├── next.config.ts                    # withSerwistInit wrapper
├── components.json                   # shadcn config
└── package.json
```

## Key config

- **`next.config.ts`** — wraps the config with `withSerwistInit({ swSrc: "src/app/sw.ts", swDest: "public/sw.js" })`
- **`src/app/sw.ts`** — `Serwist` instance using `defaultCache`, with fallback `/~offline` for document requests
- **`build` script** — uses `--webpack` because Serwist's Turbopack support is still experimental
- **Service worker** — disabled in development by default (Serwist behavior)

## Commands

```bash
npm run dev      # dev server on http://localhost:3000 (SW disabled)
npm run build    # production build (emits public/sw.js)
npm start        # production server (SW active)
npm run lint
```

## Verifying the PWA

In Chrome on `http://localhost:3000` (after `npm run build && npm start`):

1. **Application → Manifest** — shows name "Innolympics", 4 icons, `display: standalone`
2. **Application → Service Workers** — `sw.js` registered and activated
3. **Network tab → Offline → reload** — `/~offline` fallback renders
4. **Lighthouse → PWA** — should pass installability checks

## Known deviations from a vanilla setup

- Next 16 (not 15) — `create-next-app@latest` ships v16
- shadcn style is `base-nova` — shadcn v4 replaced the old `new-york`/`default` names with named presets
- Icons are placeholder white squares (`sips`-generated) — replace with real branded icons before shipping
- Build uses `--webpack` — swap to Turbopack when `@serwist/turbopack` stabilizes

## Adding shadcn components

```bash
npx shadcn@latest add button card dialog
```

Components land in `src/components/ui/` and import via `@/components/ui/<name>`.

## Plan & spec references

- `docs/superpowers/specs/2026-04-25-nextjs-shadcn-pwa-setup-design.md` — design
- `docs/superpowers/plans/2026-04-25-nextjs-shadcn-pwa-setup.md` — implementation plan
