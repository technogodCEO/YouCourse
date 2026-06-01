# YouCourse

YouCourse lets anyone build structured learning courses from YouTube videos. Creators enter a topic; AI generates a curriculum, finds matching YouTube videos, and writes comprehension questions. Learners watch each video and must pass a quiz (≥70%) to unlock the next.

**Core value:** Provable comprehension — not just views, but verified understanding.

**Constraints:** YouTube API called once at course creation (cached). LLM questions generated in batch at creation. Web-first, mobile-responsive. Auth required to create; browsing may be anonymous.

---

## Documentation

All project state lives in `.documentation/`:

| File | Contents |
|------|----------|
| `STATE.md` | Current build status, all active decisions, open blockers, env vars, v2 backlog |
| `ROADMAP.md` | Phase history, v2 plans, out-of-scope list |
| `UI-BRAND.md` | Color system, typography, component primitives, accessibility |
| `SECURITY-DEFERRED.md` | Known security issues deferred with rationale |
| `HISTORY.md` | Record of all executed plans and key decisions |
| `IDEAS.md` | Long-horizon ideas, strategic notes, unvetted concepts |
| `.planning/` | Active plans only — work in progress |

**Start here for context:** Read `STATE.md` first, then `ROADMAP.md`. For UI work, read `UI-BRAND.md` before writing any styles.

---

## Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | Next.js 16.2.6 — App Router only | No `pages/` router. Server Components + Server Actions throughout. |
| Language | TypeScript 5.x | Strict mode. |
| Styling | Tailwind CSS v4 | No component library. Primitives in `UI-BRAND.md`. |
| Database | PostgreSQL via Neon | Drizzle ORM (`drizzle-orm` + `@neondatabase/serverless`). Not Prisma. |
| Auth | Auth.js v5 (`next-auth@beta`) | JWT strategy, Credentials provider, DrizzleAdapter. `proxy.ts` for route protection (Next.js 16 convention). |
| LLM | Groq `llama-3.3-70b-versatile` | Via Vercel AI SDK (`ai` + `@ai-sdk/groq`). Always use `generateObject` + Zod schema — never `generateText` + `JSON.parse`. |
| Video | `react-youtube` | Not `@next/third-parties` — programmatic player state required for quiz gate. |
| Email | Resend | Password reset only. Swap sender domain to verified domain before production. |
| Validation | Zod v4 | All Server Action inputs and LLM output shapes. |

### Hard rules
- LLM calls: **server-side only** — never from the client. Use `server-only` import guard on lib modules.
- YouTube API: **called once at course creation**, result cached in DB. Never called per student view.
- Server Action inputs: **always validate enum values at runtime** — TypeScript types are compile-time only.
- LLM output: **always use `generateObject` with a Zod schema** — do not parse freetext LLM responses.
- Route protection: handled by `proxy.ts` + `verifySession()` in `dal.ts` — call `verifySession()` before any DB fetch.

---

## Architecture

```
src/
  actions/        Server Actions (mutations) — all validated with Zod
  app/            Next.js App Router pages
  components/     React components — client/ server split explicit
  lib/
    ai/           LLM calls (server-only) — curriculum.ts, questions.ts
    auth.ts       Auth.js v5 config
    dal.ts        Data access layer — verifySession(), getUser()
    db/           Drizzle client + schema
    youtube/      YouTube API calls (server-only)
  types/          Shared TypeScript types
proxy.ts          Next.js 16 route protection middleware
```

Schema: `users → courses → lessons → questions`, `users → userProgress → lessons`

---

## Conventions

- Auth guard order: `verifySession()` before any DB fetch in Server Components
- Enum validation: use explicit `if (val !== "a" && val !== "b") return { error }` in Server Actions
- No bare `JSON.parse` on external data — wrap in try/catch and validate shape with Zod

---

## Planning

Before making non-trivial changes (new features, schema changes, refactors), briefly describe the plan in conversation first. This isn't enforced — it's to avoid building something the user didn't intend. Small fixes and doc updates don't need prior discussion.
