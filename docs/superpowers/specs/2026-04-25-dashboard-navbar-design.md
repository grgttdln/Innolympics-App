# Dashboard Navbar — Design

Date: 2026-04-25

## Purpose

Top bar on `/dashboard` showing a Tagalog time-based greeting, the user's
first name, a notification bell, and an avatar. First step of the dashboard
UI build.

## Scope

- Build a `DashboardHeader` component that visually matches the mockup.
- Pull the user's name dynamically from a minimal localStorage-based session.
- Persist the user on login and signup so the dashboard can read it.
- Redirect to `/login` if there is no stored user.

Out of scope: real cookie-based sessions, bell/avatar interactions, logout.
These are later steps.

## Files

### New

1. `src/lib/session.ts`
   - `type StoredUser = { id: number; email: string; name: string }`
   - `SESSION_KEY = "innolympics:user"`
   - `saveUser(u: StoredUser): void` — writes JSON to localStorage.
   - `loadUser(): StoredUser | null` — reads and parses; returns null on
     missing/malformed data. Guards `typeof window`.
   - `clearUser(): void` — removes the key.

2. `src/lib/greeting.ts`
   - `getTagalogGreeting(now: Date): string`
     - hours 5–11 → `"Magandang umaga,"`
     - hours 12–17 → `"Magandang hapon,"`
     - else → `"Magandang gabi,"`

3. `src/components/dashboard-header.tsx`
   - Props: `{ name: string; now?: Date }`
   - Left column: greeting (15px, `#666`) over name (32px bold, `#1A1A1A`).
   - Right: bell chip (44px round, neutral bg) + avatar (44px round, `#A881C2`
     bg, white uppercase first letter).
   - If `name` is empty after trim: avatar shows `?`; greeting shows without
     name.
   - Uses lucide `Bell` icon.

### Changed

4. `src/app/login/page.tsx`
   - On successful login, `saveUser({ id, email, name })` from response
     before `router.push("/dashboard")`.

5. `src/app/signup/page.tsx`
   - On successful signup (201), `saveUser(created)` before routing to
     dashboard.

6. `src/app/dashboard/page.tsx`
   - Becomes `"use client"`.
   - `useEffect`: `const u = loadUser(); if (!u) router.replace("/login");
     else setUser(u)`.
   - While `user` is null: render the mobile frame without the header (avoids
     name flash).
   - Once loaded: render `<DashboardHeader name={user.name} />`.

## Component contract

`DashboardHeader`
- Inputs: `name` (string), `now` (optional Date, defaults to `new Date()`).
- Outputs: none. Pure presentational.
- No side effects, no fetch, no router. Easy to render in isolation.

## Rationale

- **Why localStorage and not a cookie session?** There is no session infra
  yet. localStorage is the minimum needed to make the navbar dynamic without
  building an auth layer in the same step. The API already returns
  `{ id, email, name }` from `/api/login` and `/api/signup`, so storing the
  response is enough.
- **Why client-side dashboard?** localStorage is client-only; a server
  component can't read it. Cookie session would allow server lookup and
  remove the loading flash — tracked as a later step.
- **Why `getTagalogGreeting` in its own file?** Keeps the component pure and
  makes the greeting function trivially unit-testable.

## Later steps (not this PR)

- Replace localStorage session with httpOnly signed cookie + server-side
  lookup in `/dashboard`.
- Logout route + clearing the session on logout.
- Bell and avatar interactions (notifications panel, profile menu).
