# YouCourse — Project State

**Last updated:** 2026-05-31
**Milestone:** v1.0
**Status:** All 4 phases shipped. Security hardening complete.

---

## Current Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 01 Foundation | Scaffold, schema, auth | Complete (2026-05-30) |
| 02 AI Ingestion | Curriculum gen, YouTube search, question gen | Complete |
| 03 Course Creation | Generate form, course pages, edit, dashboard | Complete |
| 04 Learner Flow | Video player, quiz engine, progress tracking | Complete |

---

## What's Built (v1 Feature Status)

| Requirement | Description | Status |
|------------|-------------|--------|
| AUTH-01 | Sign up with email + password | ✅ |
| AUTH-02 | Log in with email + password | ✅ |
| AUTH-03 | Password reset via email (Resend) | ✅ |
| AUTH-04 | Session persists across refresh | ✅ |
| CGEN-01 | Topic + length form kicks off generation | ✅ |
| CGEN-02 | LLM generates ordered curriculum | ✅ |
| CGEN-03 | YouTube search picks best video per topic | ✅ |
| CGEN-04 | Video metadata cached at creation | ✅ |
| CGEN-05 | Comprehension questions batch-generated per video | ✅ |
| CGEN-06 | Public / private visibility toggle | ✅ |
| CGEN-07 | Course title + description editable | ✅ |
| LRNN-01 | Course detail page with curriculum list | ✅ |
| LRNN-03 | Video embedded via react-youtube | ✅ |
| LRNN-04 | Quiz presented after each video | ✅ |
| LRNN-05 | Must score ≥70% to unlock next lesson | ✅ |
| LRNN-06 | Quiz retry on failure | ✅ |
| LRNN-07 | Progress saved, resumes from last completed | ✅ |

---

## Active Decisions (still in effect)

### Database
- Drizzle ORM with `@neondatabase/serverless` neon-http driver
- `db/index.ts` uses a placeholder fallback so `next build` succeeds without `DATABASE_URL`; throws at runtime if unset
- `turbopack.root = __dirname` in `next.config.ts` to silence workspace root warning

### Auth
- JWT stateless sessions via Auth.js v5 — no sessions table; session encoded in signed httpOnly cookie
- `proxy.ts` (Next.js 16 filename convention) wraps `auth()` for route protection — runs at edge before page render
- Protected routes: `/dashboard`, `/generate`, `/courses/*`, `/learn/*`
- Public routes: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Unauthenticated access to protected route → redirect to `/login`
- Authenticated users are only redirected away from `/login` and `/signup` (not all public routes — prevents redirect loop)
- `verifySession()` in `dal.ts` calls `auth()` directly; custom `session.ts` encrypt/decrypt was removed (dead code)

### Validation
- All Server Actions validate enum inputs (lengthPreset, visibility) at runtime before DB write — TypeScript types alone are not sufficient
- Zod used for LLM output schemas via `generateObject` — no bare `JSON.parse` on LLM responses
- Password: `min(8)`, `max(72)` (bcrypt truncates at 72 bytes)
- Topic input: max 200 characters

### LLM
- Groq `llama-3.3-70b-versatile` via Vercel AI SDK (`@ai-sdk/groq`)
- `generateObject` + Zod schema for both curriculum and question generation — not `generateText` + regex
- Questions and curriculum generated at course creation time; no on-demand LLM calls per student view

### YouTube
- YouTube Data API v3, server-side only, called once at course creation
- `searchYouTubeVideo` throws at startup if `YOUTUBE_API_KEY` is missing
- `react-youtube` used (not `@next/third-parties` YouTubeEmbed) for programmatic player state needed by quiz gate logic

### Security
- `submitQuiz` returns only `wrongIndexes` on failure — correct answer key never leaves server
- `initProgress` verifies course is `ready` and accessible before inserting progress rows
- `skipLesson` server-side guard: only allows skip when `lesson.youtubeVideoId === null`
- CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` headers set in `next.config.ts`

---

## Open Blockers / Pre-Launch Actions

| Item | Detail |
|------|--------|
| Resend sender domain | Currently using `onboarding@resend.dev` (Resend shared dev domain). Must swap to a verified custom domain in `src/lib/mail.ts` before production launch. |
| YouTube captions OAuth | `captions.download` requires OAuth. Current implementation falls back to question generation without transcript when captions are unavailable. Full transcript-based questions require connecting creator YouTube OAuth. |
| esbuild L-4 | `esbuild ≤0.24.2` via `drizzle-kit` (GHSA-67mh-4wv8-2f99). Dev-only. Fix requires drizzle-kit downgrade. Tracked in `SECURITY-DEFERRED.md`. |

---

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `DATABASE_URL` | Runtime | Neon Console → Project → Connection (pooled) |
| `AUTH_SECRET` | Runtime | `openssl rand -base64 32` |
| `YOUTUBE_API_KEY` | Runtime | Google Cloud Console → YouTube Data API v3 |
| `GROQ_API_KEY` | Runtime | Groq Console |
| `RESEND_API_KEY` | Runtime | Resend Dashboard → API Keys |
| `NEXT_PUBLIC_APP_URL` | Runtime | `http://localhost:3000` for dev |

---

## v2 Backlog

- Learner: request additional questions (served from cached transcript, no new LLM call)
- Learner: flag a question as incorrect/unclear
- Learner: completion record/certificate
- Creator: review and edit curriculum before video search runs
- Creator: swap individual videos after generation
- Discovery: public course catalog with keyword search
- Monetization: private course paywall
