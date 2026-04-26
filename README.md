# Tala

**Your calm space to capture ideas, plan your days, and move at your own pace.**

Tala is an AI-powered mental wellness companion built as a Progressive Web App (PWA). It features voice journaling with real-time transcription, guided journaling, live AI-driven conversations, wellness tracking, and professional consultation — all designed around a warm, approachable mobile-first interface.

Built by **Joji Tech** for the Innolympics.

---

## Features

- **Voice Journaling** — Record voice entries with a live waveform visualizer; transcripts are generated automatically via Google Gemini
- **Guided Journaling** — Structured prompts powered by a LangGraph agent to help users reflect
- **Live AI Conversation** — Real-time voice conversations with an AI companion for emotional support
- **Wellness Dashboard** — Track mood trends and personal progress
- **Professional Consultation** — Connect with mental health professionals
- **Offline Support** — Full PWA with service worker caching for offline access

---

## Tech Stack

### Frameworks & Libraries

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, React Server Components) |
| **UI Library** | [React 19](https://react.dev) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com) |
| **Component Library** | [shadcn/ui](https://ui.shadcn.com) (Base Nova style) + [Base UI React](https://base-ui.com) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Database ORM** | [Drizzle ORM](https://orm.drizzle.team) |
| **Database** | [Neon](https://neon.tech) (Serverless PostgreSQL) |
| **AI / LLM** | [Google Gemini](https://ai.google.dev) (`gemini-2.5-flash`) via [`@google/genai`](https://www.npmjs.com/package/@google/genai) |
| **AI Orchestration** | [LangChain](https://js.langchain.com) + [LangGraph](https://langchain-ai.github.io/langgraphjs/) |
| **PWA / Service Worker** | [Serwist](https://serwist.pages.dev) |
| **Validation** | [Zod](https://zod.dev) |
| **Authentication** | [bcrypt.js](https://www.npmjs.com/package/bcryptjs) |
| **Testing** | [Vitest](https://vitest.dev) |
| **Linting** | [ESLint](https://eslint.org) |

### AI & Design Tools

| Tool | Purpose |
|---|---|
| [Google Gemini 2.5 Flash Lite](https://ai.google.dev) | LLM for transcription, guided journaling, and live conversation |
| [Google AI Studio](https://aistudio.google.com) | Prototyping and testing Gemini prompts |
| [.pen](https://pen.design) | UI/UX design and mockups |

### Code Editors

| Editor | |
|---|---|
| [Visual Studio Code](https://code.visualstudio.com) | Primary IDE |
| [Claude Code](https://claude.ai) | AI-assisted coding |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Google AI Studio](https://aistudio.google.com) API key

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd Innolympics-App

# Install dependencies
npm install

# Copy environment variables and fill in your keys
cp .env.example .env.local

# Push the database schema
npm run db:push

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:migrate` | Run database migrations |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # Server-side API endpoints
│   ├── dashboard/        # Wellness dashboard
│   ├── journal/          # Voice & guided journaling
│   ├── login/            # Authentication
│   ├── signup/
│   ├── professional/     # Professional consultation
│   ├── profile/          # User profile
│   ├── wellness/         # Wellness features
│   └── sw.ts             # Service worker entry
├── components/           # Reusable UI components
└── lib/                  # Utilities, hooks, DB, AI agents
    ├── agents/           # LangGraph AI agents
    ├── db/               # Drizzle schema & database
    ├── memory/           # Conversation memory management
    └── safety/           # Content safety filters
```

---

## Team

**Joji Tech**

- Georgette Dalen Cadiz
- Wince Larcen Rivano
- Adriel Groyon
- Joshua Dampil

---

## License

This project was built for the Innolympics competition.
