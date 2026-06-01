# YouCourse — Project State

**Last updated:** 2026-05-31
**Milestone:** v1.0
**Status:** All 4 phases shipped. Security hardening complete.

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 01 Foundation | Scaffold, schema, auth | Complete (2026-05-30) |
| 02 AI Ingestion | Curriculum gen, YouTube search, question gen | Complete |
| 03 Course Creation | Generate form, course pages, edit, dashboard | Complete |
| 04 Learner Flow | Video player, quiz engine, progress tracking | Complete |
| SEC-01 | Security hardening (14 findings) | Complete (2026-05-31) |

---

## Installed Stack

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.6 | Framework — App Router, Server Actions, Server Components |
| `react` / `react-dom` | 19.2.4 | UI layer |
| `typescript` | ^5 | Strict mode |
| `tailwindcss` | ^4 | Styling — no component library |
| `next-auth` | ^5.0.0-beta.31 | Auth — JWT strategy, Credentials provider |
| `@auth/drizzle-adapter` | ^1.11.2 | Auth.js ↔ Drizzle bridge |
| `drizzle-orm` | ^0.45.2 | ORM |
| `drizzle-kit` | ^0.31.10 | Schema migrations (`npm run db:push`) |
| `@neondatabase/serverless` | ^1.1.0 | Neon HTTP driver |
| `ai` | ^6.0.193 | Vercel AI SDK |
| `@ai-sdk/groq` | ^3.0.39 | Groq provider |
| `@ai-sdk/google` | ^3.0.80 | Google provider (installed, not active) |

| `bcryptjs` | ^3.0.3 | Password hashing (cost factor 12) |
| `zod` | ^4.4.3 | Validation — use `z.string().email()` not `z.email()` (v3-compat API) |
| `resend` | ^6.12.4 | Transactional email — password reset only |
| `react-youtube` | ^10.1.0 | YouTube player — programmatic state via `onStateChange` |
| `youtube-transcript` | ^1.3.1 | Caption fetch (fallback when OAuth unavailable) |
| `jose` | ^6.2.3 | Installed — currently unused (`session.ts` was deleted in SEC-01) |
| `server-only` | ^0.0.1 | Bundle guard on LLM/DB modules |

**Dev command:** `npm run dev` (Turbopack, no flag needed)
**Schema push:** `npm run db:push` (wraps `drizzle-kit push` with `--env-file=.env.local`)

---

## Architecture

### Directory Map

```
src/
  actions/                   Server Actions — all inputs Zod-validated
    auth.ts                  signup, login, logout
    password-reset.ts        requestPasswordReset, applyPasswordReset
    generate-course.ts       full pipeline orchestration
    update-course.ts         title, description, visibility
    delete-course.ts         owner-only delete
    init-progress.ts         seed userProgress rows when learner starts course
    submit-quiz.ts           grade answers, update progress on pass
    skip-lesson.ts           mark no-video lessons complete
  app/                       Next.js App Router — Server Components by default
    (auth)/                  Auth layout group
      login/page.tsx
      signup/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
    api/auth/[...nextauth]/  Auth.js route handler
    dashboard/page.tsx       Protected — lists user's created courses
    generate/page.tsx        Course generation form
    courses/[courseId]/      Course detail + edit
    learn/[courseId]/        Course overview for learner
    learn/[courseId]/[lessonId]/  Video + quiz page
  components/
    auth/                    Login/signup/logout forms (client)
    course/                  Generate form, course poller, edit form, delete/copy buttons
    learn/                   LessonPlayer, VideoPlayer, Quiz, SkipLessonButton
  lib/
    ai/
      curriculum.ts          generateCurriculum() — server-only
      questions.ts           generateQuestions() — server-only
    auth.ts                  NextAuth config with DrizzleAdapter + Credentials
    auth.config.ts           Route protection logic (shared with proxy.ts)
    dal.ts                   verifySession(), getUser() — server-only
    db/
      index.ts               Drizzle client (neon-http)
      schema.ts              All table definitions
    youtube/
      search.ts              searchYouTubeVideo() — server-only
      transcript.ts          Transcript fetch — server-only
    definitions.ts           Zod schemas: SignupSchema, LoginSchema
    mail.ts                  sendPasswordResetEmail() via Resend
  types/
    next-auth.d.ts           Session type augmentation (adds user.id)
  emails/
    reset-password.tsx       Branded HTML email template
proxy.ts                     Next.js 16 middleware (exported as `proxy`)
```

### Database Schema

```
users
  id, email, password (bcrypt), displayName, name, image, emailVerified, createdAt

accounts                     (Auth.js OAuth adapter table — unused in v1)
verificationTokens           (Auth.js — unused in v1)
passwordResetTokens
  id, email, token, expires  (single active token per email, 1-hour TTL)

courses
  id, creatorId → users.id, title, topic, description
  lengthPreset               "quick" | "standard" | "long"
  visibility                 "public" | "private"
  status                     "generating" | "ready" | "error"
  createdAt

lessons
  id, courseId → courses.id, position (0-indexed), topic
  youtubeVideoId, videoTitle, videoDurationSeconds
  transcriptCached, transcriptStatus  "pending" | "unavailable"
  createdAt

questions
  id, lessonId → lessons.id, position, questionText
  options                    TEXT column — JSON array of 4 strings
  correctIndex               0–3
  createdAt

userProgress
  id, userId → users.id, courseId → courses.id, lessonId → lessons.id
  passedQuiz (bool), completedAt, createdAt
  UNIQUE (userId, lessonId)
```

---

## Key Flows

### Auth Session Flow
1. `proxy.ts` runs on every request (Next.js 16 middleware, exports `auth as proxy`)
2. `auth.config.ts` `authorized()` callback checks protected routes — no DB hit (JWT only)
3. Server Components call `verifySession()` from `dal.ts` → calls `auth()` → redirects to `/login` if no session
4. `auth()` in `lib/auth.ts` uses DrizzleAdapter but only hits DB for OAuth account creation — JWT reads are pure crypto

### Course Generation Pipeline
1. User submits topic + lengthPreset via `GenerateForm`
2. `generateCourse` Server Action:
   - Validates topic (non-empty, ≤200 chars) and lengthPreset enum
   - Inserts `courses` row with `status: "generating"`
   - Calls `generateCurriculum(topic, lengthPreset)` → Groq → returns ordered `string[]` of lesson topics
   - Inserts lesson stubs sequentially (preserves position order)
   - Processes all lessons in parallel (`Promise.all`) with per-lesson error isolation:
     - `searchYouTubeVideo(lessonTopic)` → YouTube Data API v3
     - If no video: sets `transcriptStatus: "unavailable"`, continues
     - If video found: stores `youtubeVideoId`, `videoTitle`, `videoDurationSeconds`
     - `generateQuestions(null, lessonTopic, videoTitle)` → Groq → 5 questions
     - Inserts questions; sets `transcriptStatus: "unavailable"`
   - Updates course `status: "ready"`
3. Frontend polls via `CoursePoller` component until status changes

### Quiz Gate Flow
1. Learner opens `/learn/[courseId]` → `initProgress` seeds `userProgress` rows (no-op if already seeded via `onConflictDoNothing`)
2. Learner navigates to `/learn/[courseId]/[lessonId]`
3. Server Component fetches all prior lessons, checks all have `passedQuiz: true` in `userProgress` — redirects to course overview if not
4. `LessonPlayer` renders `VideoPlayer` (react-youtube) + `Quiz`
5. `VideoPlayer` listens for `onStateChange` → state 0 (ended) → triggers quiz reveal
6. `Quiz` calls `submitQuiz` Server Action → grades answers → returns `{ passed, score, wrongIndexes? }`
7. On pass: `userProgress` updated, `onPassed` callback fires, next lesson unlocked

### Password Reset Flow
1. User submits email to `requestPasswordReset` — always returns same message (no email enumeration)
2. If user exists: deletes any prior token, inserts new `passwordResetTokens` row (1-hour TTL), sends email via Resend
3. User clicks link → `/reset-password?token=...` → page awaits `searchParams` (Next.js 16 async)
4. `applyPasswordReset` validates token not expired, hashes new password (bcrypt cost 12), deletes token, updates user

---

## Active Decisions

### Framework
- App Router only — no `pages/` router. All data fetching via Server Components + Server Actions.
- `turbopack: { root: __dirname }` in `next.config.ts` — silences workspace root detection warning
- `searchParams` in Next.js 16 is a `Promise` — always `await searchParams` in Server Components

### Database
- Neon HTTP driver (`@neondatabase/serverless`) — not the WebSocket driver; works in edge and serverless
- `db/index.ts` has a placeholder fallback for `next build` static analysis; throws at runtime if `DATABASE_URL` unset
- `npm run db:push` must be run after any schema change — wraps `drizzle-kit push --env-file=.env.local`

### Auth
- JWT sessions — no sessions table, no forced server-side revocation (acceptable for v1)
- `auth.config.ts` exported separately from `auth.ts` so proxy.ts can import it without pulling in DrizzleAdapter (which can't run at the edge)
- Protected routes defined in `auth.config.ts`: `/dashboard`, `/courses`, `/generate`, `/learn`
- Authenticated users redirected away from `/login` and `/signup` only — not all public routes (prevents redirect loop on `/forgot-password`)
- `user.id` is available in session via type augmentation in `src/types/next-auth.d.ts`

### Validation
- All Server Actions runtime-validate enum inputs — TypeScript types are compile-time only, Server Actions receive `FormData` strings
- Zod `z.string().email()` not `z.email()` — v3-compatible API; both work in v4 but v3 form is safer
- Password: `min(8).max(72)` — bcrypt silently truncates at 72 bytes

### LLM
- `generateObject` with a Zod schema always — never `generateText` + regex + `JSON.parse`
- Groq `meta-llama/llama-4-scout-17b-16e-instruct` — ~5x cheaper than previous `llama-3.3-70b-versatile` ($0.11/$0.34 vs $0.59/$0.79 per 1M tokens), native `json_schema` structured outputs support
- `llama-3.3-70b-versatile` does NOT support `json_schema` — do not switch back without verifying structured outputs support on the target model
- `@ai-sdk/google` is installed but not active
- LLM calls are server-only (`import "server-only"` at top of `lib/ai/*.ts`)
- Topic capped at 200 chars to limit prompt injection surface and API spend

### YouTube
- API called once per lesson at course creation — result cached in DB, never called per student view
- `react-youtube` not `@next/third-parties/youtube` — need `onStateChange` for programmatic player control
- `searchYouTubeVideo` throws if `YOUTUBE_API_KEY` missing (no silent failure)
- Transcript download via `youtube-transcript` package; falls back gracefully when unavailable

### Security
- `verifySession()` called before every DB fetch in Server Components — auth guard order is non-negotiable
- `submitQuiz` never returns correct answer indices — only `wrongIndexes` on failure
- `skipLesson` validates server-side that the lesson has no video before marking complete
- `options` column read with try/catch + shape validation — malformed JSON skips the question rather than crashing

---

## Known Pitfalls

- **`signIn()` must be called outside try/catch in signup** — it throws a redirect, which must propagate. Catching it breaks the redirect.
- **`db/index.ts` placeholder** — the `neon()` placeholder is intentional for build time. Do not remove it; the runtime guard (`if (!dbUrl)`) is what protects production.
- **DrizzleAdapter in proxy.ts** — `auth.ts` (which includes DrizzleAdapter) cannot be imported in `proxy.ts`. Use `auth.config.ts` (no adapter) in the proxy. This is why the two files are split.
- **`options` is TEXT not jsonb** — `JSON.parse(q.options)` on the lesson page; always wrap in try/catch and validate the result is a `string[]` of length 4.
- **`jose` is still installed** but unused since `session.ts` was deleted. Safe to remove if cleaning up dependencies.
- **YouTube captions** — `captions.download` via the Data API requires OAuth, not just an API key. The current implementation generates questions from the video title/topic when transcript is unavailable. Full transcript-based questions require creator OAuth connection (unresolved — see blockers).
- **`next build` without env vars** — the build succeeds intentionally (placeholder fallback). Missing env vars only surface at runtime. Always test with actual env vars before deploying.
- **Enum validation in Server Actions** — `formData.get("visibility")` returns a string regardless of TypeScript type. Always do an explicit `if (val !== "public" && val !== "private")` check before using as an enum.

---

## Open Blockers / Pre-Launch Actions

| Item | Detail |
|------|--------|
| Resend sender domain | Using `onboarding@resend.dev` (Resend shared dev domain). Swap to verified custom domain in `src/lib/mail.ts` before production. |
| YouTube captions OAuth | `captions.download` requires OAuth. Questions currently generated from title/topic as fallback. Full transcript quality requires creator YouTube OAuth connection. |
| esbuild vulnerability | `esbuild ≤0.24.2` via `drizzle-kit` (GHSA-67mh-4wv8-2f99, dev-only). Fix requires breaking downgrade. See `SECURITY-DEFERRED.md`. |

---

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `DATABASE_URL` | Runtime | Neon Console → Project → Connection (pooled) |
| `AUTH_SECRET` | Runtime | `openssl rand -base64 32` |
| `YOUTUBE_API_KEY` | Runtime | Google Cloud Console → APIs & Services → YouTube Data API v3 |
| `GROQ_API_KEY` | Runtime | console.groq.com → API Keys |
| `RESEND_API_KEY` | Runtime | resend.com → Dashboard → API Keys |
| `NEXT_PUBLIC_APP_URL` | Runtime | `http://localhost:3000` for dev; production URL for prod |

---

## v2 Backlog

v2 is phased. See `ROADMAP.md` for the full plan. Monetization deferred to v3.

**Phase 1 — Creator Pipeline Fixes**
- New `video_cache` table keyed by `youtubeVideoId` — deduplicates transcript + metadata fetches across courses; `lessons` drops `transcriptCached`, `videoTitle`, `videoDurationSeconds` in favour of a join
- Creator can swap a bad video on any lesson (replaces video + regenerates questions)
- Creator can retry question generation on lessons where transcript was unavailable
- Creator can delete a broken lesson (cascades to questions + progress rows)

**Phase 2 — Learner Polish**
- On-demand question sets: unlimited batches from cached transcript; `questions.setIndex` (0 = original, 1+ = on-demand); pro gate deferred to v3
- Question flagging: `question_flags` table; creators see flag counts per question
- Completion records: `course_completions` table; shareable `/learn/[courseId]/complete` page

**Phase 3 — Discovery**
- Public catalog at `/catalog` — anonymous browsing, cached with short TTL
- Keyword search via Postgres `ILIKE` on title + topic
- Length filter chips; subject-area filter deferred
- `generateMetadata` on public course pages for SEO; private pages get `noindex`

**Dropped**
- ~~Creator: review and edit curriculum before video search runs~~ — violates AI-first philosophy

### LLM Tier System (monetization-linked)

Multiple generation quality tiers backed by different models, gated by subscription plan:

| Tier | Model | Strategy | Notes |
|------|-------|----------|-------|
| Free | `llama-4-scout` (current) | Parallel | Fast, cheap, good enough |
| Pro | `llama-4-maverick` | Parallel | Better reasoning, ~4x cost, same speed |
| Premium | R1 → Scout chain | Sequential | R1 reasons, Scout formats to schema; highest open-model quality |
| Premium+ (future) | Claude Opus or GPT-4o | Sequential | Proprietary model ceiling; add `@ai-sdk/anthropic` or `@ai-sdk/openai` when needed |

**Sequential vs parallel:** parallel runs all lesson generations simultaneously (current approach — fast). Sequential chains them — curriculum informs video search, transcript informs question generation, prior questions inform subsequent ones — slower but more coherent across lessons. Worth exploring for premium tier where latency is acceptable.

**R1 chain pattern:** R1 (DeepSeek-R1-Distill-Llama-70B) does not support `json_schema` natively but produces strong chain-of-thought reasoning. Chain it with Scout: R1 reasons through the problem, Scout takes R1's output and formats it into the Zod schema. Two API calls per step but significantly better question quality (distractors that actually distract, unambiguous correct answers).

**Provider strategy:** Groq is the right choice now — fastest inference, cheapest pricing, clean structured outputs on Scout/Maverick, and the Vercel AI SDK abstracts the provider entirely. Switching to a hybrid (Groq for free/pro, Anthropic/OpenAI for premium) is a one-line change per call site when the time comes — just add `@ai-sdk/anthropic` or `@ai-sdk/openai`. No refactor needed. Stay on Groq until there's a specific reason to leave (quality ceiling, reliability at scale, or a tier that genuinely requires proprietary model reasoning).
