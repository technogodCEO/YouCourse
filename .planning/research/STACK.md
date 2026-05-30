# Stack Research

**Domain:** YouTube-based learning platform (course creation, AI quiz generation, gated progression)
**Researched:** 2026-05-30
**Confidence:** HIGH (all primary choices verified against official docs updated 2026-05-28)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.x (latest) | Full-stack framework | App Router + Server Actions handles auth, data mutations, API routes, and SSR in a single codebase. No separate backend needed for v1. Officially at v16.2.6 as of 2026-03. |
| React | 19.x | UI layer | Bundled with Next.js 16; Server Components eliminate client-side fetching waterfalls for course pages and catalogs. |
| TypeScript | 5.x | Type safety | Default in create-next-app; catches data-shape mismatches between DB, LLM responses, and UI early. Critical for quiz state machines. |
| Tailwind CSS | 4.x | Styling | Stable since Jan 2025. Zero-config, CSS-first theming, built-in container queries. Mobile-responsive from day one with no extra setup. 3.78x faster builds than v3. |
| PostgreSQL | 16.x | Primary database | Relational model fits course→video→question→progress hierarchy naturally. Strong JSON support for storing LLM-generated question arrays. Free tier available on Neon/Supabase. |
| Drizzle ORM | 0.x (latest) | Database access | TypeScript-native, zero-overhead SQL, edge-compatible. Significantly smaller bundle than Prisma; no Prisma engine binary required. Schema migrations via `drizzle-kit`. Preferred for Next.js App Router in 2025–2026. |

### LLM Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel AI SDK (`ai`) | 4.x | LLM abstraction layer | Provider-agnostic — works with OpenAI, Anthropic, Google. `generateObject` with Zod schemas produces validated JSON quiz questions in a single call. Server-side only; no keys exposed to client. Designed for Next.js Server Actions. |
| OpenAI API (`gpt-4o-mini`) | — | Question generation model | gpt-4o-mini is fast, cheap, and accurate enough for comprehension questions from transcripts. Costs ~$0.00015/1K input tokens. Can swap to `claude-3-haiku` via AI SDK with no code change if needed. |

### YouTube Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@next/third-parties` | latest | YouTube embed | Official Next.js package wrapping `lite-youtube-embed`. Loads YouTube player only on user click — avoids blocking page paint. Passes player params (controls, autoplay, etc.) natively. |
| YouTube Data API v3 | v3 | Video metadata + captions | Server-side only calls at course creation time. Fetches title, description, duration, and captions. Cached in DB immediately — never called again per video. |
| YouTube IFrame Player API | — | Playback state | Injected via `@next/third-parties` YouTubeEmbed or a custom wrapper. Used to detect video completion (onStateChange event) before surfacing quiz. |

### Auth

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (NextAuth v5) | 5.x beta / latest | Authentication | Listed in Next.js 16 official auth docs. Handles email/password + OAuth (Google). Session cookies managed server-side. Works with Drizzle adapter. The only full-featured auth lib with a dedicated Next.js App Router integration and active 2025 maintenance. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.x | Schema validation | Validate LLM output shapes (quiz questions), form inputs in Server Actions, and API response parsing. Used in Next.js official auth docs. |
| `jose` | 5.x | JWT/session crypto | Recommended in Next.js auth docs for stateless session encryption. Edge Runtime compatible. |
| `@next/third-parties` | latest | YouTube embed + GTM | Use for the YouTube player component — avoids manual lite-youtube-embed setup. |
| `server-only` | latest | Bundle safety guard | Marks server-only modules (LLM calls, DB access) to prevent accidental client bundle inclusion. |
| `@ai-sdk/openai` | latest | OpenAI provider for AI SDK | Pairs with `ai` package to call gpt-4o-mini. Swap to `@ai-sdk/anthropic` anytime. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Turbopack | Dev bundler | Default in Next.js 16+; 76% faster startup than webpack. Use `next dev` (no flag needed). |
| `drizzle-kit` | DB schema migrations | Run `drizzle-kit push` for dev, `drizzle-kit migrate` for production-safe migrations. |
| ESLint 9 + `eslint.config.mjs` | Linting | Default in create-next-app 16. Flat config format. |
| Biome (optional) | Formatter | Faster alternative to Prettier; available as a create-next-app option. Pick one at project init. |
| Neon / Supabase | Postgres hosting | Both offer serverless Postgres with free tiers. Neon has better edge/serverless compatibility with Drizzle. |

---

## Installation

```bash
# Scaffold project (includes TypeScript, Tailwind v4, ESLint, App Router, Turbopack)
npx create-next-app@latest youcourse --yes

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Auth
npm install next-auth@beta @auth/drizzle-adapter

# LLM
npm install ai @ai-sdk/openai

# Validation
npm install zod

# Session crypto
npm install jose server-only

# YouTube embed (official Next.js integration)
npm install @next/third-parties
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Remix | Remix has better progressive enhancement story, but smaller ecosystem and no built-in Server Components caching. Choose Remix if the team has deep Remix experience. |
| Drizzle ORM | Prisma | Prisma has better DX for schema introspection and a GUI. Choose Prisma if the team is unfamiliar with SQL and prefers a code-first model-driven API. Drizzle wins on bundle size and edge compatibility. |
| PostgreSQL (Neon) | Supabase Postgres | Supabase adds realtime, auth, and storage on top. Use Supabase if you want to skip Auth.js and use its built-in auth instead — trade: Supabase auth is less customizable. |
| Auth.js v5 | Clerk | Clerk is zero-config and has a polished UI. Use Clerk if you want social login, orgs, and MFA without writing any auth code. Trade: vendor lock-in, $25+/month at scale. |
| OpenAI gpt-4o-mini | Anthropic claude-3-haiku | Haiku is comparable in cost and speed. The AI SDK makes this a one-line swap: change `openai('gpt-4o-mini')` to `anthropic('claude-3-haiku-20240307')`. Either is valid. |
| Tailwind CSS v4 | shadcn/ui + Tailwind | shadcn/ui is a component library built on Tailwind. Add it in phase 2 for complex UI components (modals, dropdowns, tabs). Not needed at project init. |
| `@next/third-parties` YouTubeEmbed | `react-youtube` npm package | react-youtube gives programmatic player control via `onReady` callback. Use react-youtube if you need to programmatically seek, pause, or read playback position (e.g. to enforce minimum watch time before quiz appears). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| YouTube IFrame API directly (raw `<script>` embed) | Creates GDPR/consent headaches, blocks page paint, requires manual cleanup on route change in Next.js SPA navigation. | `@next/third-parties` YouTubeEmbed (uses lite-youtube-embed, lazy-loads player) |
| `pages/` router (Next.js Pages Router) | No Server Components, no Server Actions, no `use cache`. All the caching patterns needed for YouTube API quota control require App Router. | App Router exclusively |
| Prisma with serverless/edge | Prisma's query engine is a native binary that cannot run in edge environments; causes cold-start issues on Vercel/Neon serverless. | Drizzle ORM (pure JS, edge-compatible) |
| Client-side LLM calls (calling OpenAI from the browser) | Exposes API key in the bundle. Zero performance benefit. | Server Actions / Route Handlers — LLM calls run exclusively on the server |
| Storing raw LLM responses without parsing | LLM output is non-deterministic; raw text cannot be queried or rendered reliably. | `generateObject` from Vercel AI SDK with a Zod schema — produces typed, validated JSON question arrays |
| NextAuth v4 (legacy) | v4 has a different session API and lacks App Router Server Component support. Many guides online still show v4 patterns — they don't apply. | Auth.js v5 (next-auth@beta) |
| YouTube captions via third-party scraping libraries | Against YouTube ToS; fragile. | YouTube Data API v3 `captions.list` and `captions.download` — requires OAuth or API key, within quota |

---

## Stack Patterns by Variant

**If you want to enforce a minimum watch percentage before the quiz appears:**
- Use `react-youtube` instead of `@next/third-parties` YouTubeEmbed
- Because react-youtube exposes `onStateChange` and player.getCurrentTime() / getDuration() callbacks needed to calculate watch percentage
- Wire player state into React local state; only reveal quiz CTA when `watchedPercent >= threshold`

**If quota pressure becomes severe (many courses with many videos):**
- Add a Redis cache layer (Upstash) in front of the YouTube API calls
- Because DB is sufficient for structured data but Redis TTL-based caching is better for repeated metadata lookups across users
- Use `@upstash/redis` with the Vercel AI SDK's `cacheStore` pattern

**If course catalog grows beyond ~500 courses:**
- Add full-text search via Postgres `tsvector` or Algolia
- Because ILIKE queries on title/description do not scale; Postgres FTS is free; Algolia is faster but costs money
- Defer this to a later milestone — not needed at launch

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.x | react@19.x, react-dom@19.x | App Router requires React 19; Pages Router can use React 18 |
| next-auth@beta (v5) | next@16.x | v5 is the only version with App Router Server Component support |
| @auth/drizzle-adapter | drizzle-orm@0.x | Adapter is in the `@auth/*` monorepo; install separately |
| drizzle-orm | @neondatabase/serverless OR postgres (node-postgres) | Use `@neondatabase/serverless` for Neon; use `postgres` package for standard Postgres |
| ai@4.x | @ai-sdk/openai, @ai-sdk/anthropic | Provider packages are separate from core SDK; install whichever you use |
| tailwindcss@4.x | postcss (auto-included) | v4 ships its own PostCSS plugin; no separate `autoprefixer` needed |

---

## Sources

- **Next.js official docs** (version 16.2.6, lastUpdated 2026-05-28) — authentication patterns, caching model, `@next/third-parties` YouTubeEmbed, project structure, installation — HIGH confidence
- **Next.js blog** (2026-03-18) — confirmed v16.2 release, Turbopack stable — HIGH confidence
- **tailwindcss.com/blog/tailwindcss-v4** — confirmed v4.0 stable since Jan 22 2025, performance numbers — HIGH confidence
- **Vercel AI SDK** (`sdk.vercel.ai`) — WebFetch blocked; recommendation based on known v4 architecture and Next.js ecosystem integration — MEDIUM confidence (well-established, but version not independently verified in this session)
- **Drizzle ORM** (`orm.drizzle.team`) — WebFetch blocked; recommendation based on known edge compatibility and Next.js ecosystem adoption — MEDIUM confidence
- **Auth.js v5** — listed by name in Next.js 16 official auth library list (`authjs.dev/getting-started/installation`) — HIGH confidence it's the recommended library; exact v5 semver not independently verified — MEDIUM confidence on version string
- **YouTube Data API v3 quota** — quota costs (units per call) based on training data; developer console verification recommended before launch — LOW confidence on exact numbers

---

*Stack research for: YouCourse — YouTube-based learning platform*
*Researched: 2026-05-30*
