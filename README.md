# Tala — Innolympics App

A mental-health companion app for quiet reflection. Tala offers a mix of **journaling**, **guided wellness exercises**, and **AI-assisted insights** in a calm, mobile-first interface.

The app is not a replacement for professional help. When the AI detects crisis language, it surfaces Philippine hotline information and a professional-help card instead of responding like a friend.

## Features

- **Text journaling** — two modes:
  - *Freeform* writing with gentle, idle-triggered follow-up questions
  - *Guided* writing via four structured methods (1-1-1, Gratitude List, Worry Dump, Evening Reflection)
- **Voice journaling** — live-transcribed voice sessions with a conversational AI companion
- **Wellness exercises** — box breathing, guided mindfulness, 5-4-3-2-1 grounding, and a camera-based "bring me" grounding game
- **Reflective insights** — a LangGraph pipeline classifies intent, checks for crisis keywords, composes a response, and stores everything with a vector embedding for memory continuity
- **Profile + entry history** — view past entries, mood trends, and a professional portal stub
- **PWA** — installable, with an offline fallback page

## Tech stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, Webpack build) on [React 19](https://react.dev)
- **Language:** [TypeScript 5](https://www.typescriptlang.org)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com) with [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css), [clsx](https://github.com/lukeed/clsx), [class-variance-authority](https://cva.style/docs), and [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- **UI primitives:** [Base UI](https://base-ui.com), [shadcn/ui](https://ui.shadcn.com), and [Lucide icons](https://lucide.dev)
- **Database:** [Neon](https://neon.tech) (serverless Postgres with pgvector) via [Drizzle ORM](https://orm.drizzle.team) and [drizzle-kit](https://orm.drizzle.team/kit-docs/overview)
- **AI orchestration:** [LangChain](https://js.langchain.com) + [LangGraph](https://langchain-ai.github.io/langgraphjs/) with the [@langchain/google-genai](https://www.npmjs.com/package/@langchain/google-genai) provider
- **AI models:** [Google Gemini](https://ai.google.dev) — `gemini-2.5-flash-lite` for chat/classification, `gemini-2.5-flash` for grounding/transcription, `gemini-3.1-flash-live-preview` for live voice, `gemini-embedding-001` for memory vectors
- **Auth + validation:** [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing, [Zod](https://zod.dev) for request/response schemas
- **PWA:** [Serwist](https://serwist.pages.dev) (`@serwist/next`)
- **Testing:** [Vitest](https://vitest.dev) with `@vitest/coverage-v8`
- **Tooling:** [ESLint 9](https://eslint.org), [tsx](https://github.com/privatenumber/tsx), [dotenv](https://github.com/motdotla/dotenv)

## Getting started

```bash
# 1. install
npm install

# 2. configure env (copy from .env.example)
cp .env.example .env.local
# fill in DATABASE_URL (Neon) and GEMINI_API_KEY (Google AI Studio)

# 3. migrate the schema
npm run db:push

# 4. run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server (Webpack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema |
| `npm run db:push` | Apply the schema directly to the database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:migrate` | Run the TS migration script |

## Project structure

```
src/
  app/                    Next.js App Router pages and API routes
    api/                  Journal, grounding, transcription, live-token, etc.
    journal/              Text (guided + freeform) and voice journaling UIs
    wellness/             Breathing, grounding, mindfulness, bring-me game
    profile/              Entry history and profile
  components/             Shared UI and feature components
  lib/
    agents/               LangGraph nodes, prompts, and graph wiring
    db/                   Drizzle schema and Neon client
    memory/               Embeddings + RAG search
    safety/               Crisis scanning and templates
drizzle/                  SQL migrations
tests/                    Vitest unit tests (agents, memory, safety)
docs/superpowers/         Project specs and implementation plans
```

## Credits

Built with the help of:

- **Google AI Studio / Gemini** — language, embedding, and live voice models
- **Neon** — serverless Postgres with pgvector
- **Vercel** — Next.js framework and Geist font family
- **LangChain** — agent orchestration and LangGraph state machine
- **shadcn/ui**, **Base UI**, **Lucide**, **Tailwind CSS** — component and design primitives
- **Drizzle ORM** — type-safe database access
- **Serwist** — service worker and PWA tooling
- **Vitest**, **ESLint**, **TypeScript** — development and testing tooling

Planning and execution of feature work was guided by the [superpowers](https://github.com/obra/superpowers) skill set and [GSD](https://github.com/grgttdln) workflow conventions; see `docs/superpowers/` for per-feature specs and plans.
