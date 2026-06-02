# YouCourse — Project State

**Last updated:** 2026-06-02
**Milestone:** v2.0
**Status:** All v2 phases implemented. PR #10 open for review.

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 01 Foundation | Scaffold, schema, auth | Complete (2026-05-30) |
| 02 AI Ingestion | Curriculum gen, YouTube search, question gen | Complete |
| 03 Course Creation | Generate form, course pages, edit, dashboard | Complete |
| 04 Learner Flow | Video player, quiz engine, progress tracking | Complete |
| SEC-01 | Security hardening (14 findings) | Complete (2026-05-31) |
| v2 Phase 1 | Creator pipeline fixes + video_cache | Complete (2026-06-02) |
| v2 Phase 2 | Learner polish: question sets, flags, completions | Complete (2026-06-02) |
| v2 Phase 3 | Discovery: catalog, SEO, anonymous access | Complete (2026-06-02) |

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
| `zod` | ^4.4.3 | Validation |
| `resend` | ^6.12.4 | Transactional email — password reset only |
| `react-youtube` | ^10.1.0 | YouTube player |
| `youtube-transcript` | ^1.3.1 | Caption fetch (fallback) |
| `jose` | ^6.2.3 | Installed, unused |
| `server-only` | ^0.0.1 | Bundle guard on LLM/DB modules |

**Dev command:** `npm run dev` (Turbopack)
**Schema push:** `npm run db:push`

---

## Architecture

### Directory Map

```
src/
  actions/
    auth.ts                  signup, login, logout
    password-reset.ts        requestPasswordReset, applyPasswordReset
    generate-course.ts       full pipeline — checks video_cache before fetching transcript
    update-course.ts         title, description, visibility
    delete-course.ts         owner-only delete
    init-progress.ts         seed userProgress rows when learner starts course
    submit-quiz.ts           grade by setIndex, update progress, detect course completion
    skip-lesson.ts           mark no-video lessons complete
    swap-video.ts            replace lesson video + regenerate questions   [v2]
    retry-questions.ts       re-fetch transcript + regenerate questions    [v2]
    delete-lesson.ts         delete lesson + renumber siblings             [v2]
    generate-question-set.ts create additional question batch from cache   [v2]
    flag-question.ts         toggle question flag for current user         [v2]
  app/
    (auth)/                  login, signup, forgot-password, reset-password
    api/auth/[...nextauth]/  Auth.js route handler
    dashboard/page.tsx       My Courses + In Progress + Completed sections [v2]
    generate/page.tsx        Course generation form
    catalog/page.tsx         Public course catalog, search, length filter  [v2]
    courses/[courseId]/      Course detail (anonymous access)              [v2]
    courses/[courseId]/edit/ Lesson management + flag counts               [v2]
    learn/[courseId]/        Course overview for learner
    learn/[courseId]/[lessonId]/  Video + quiz (question sets, flags)      [v2]
    learn/[courseId]/complete/    Shareable completion page                [v2]
    page.tsx                 Homepage with Browse CTA                      [v2]
  components/
    auth/                    Login/signup/logout forms (client)
    course/                  Generate form, course poller, edit form, delete/copy, lesson-actions [v2]
    learn/                   LessonPlayer (sets+flags), VideoPlayer, Quiz, SkipLessonButton
    nav/site-header.tsx      Shared sticky header with Browse link          [v2]
  lib/
    ai/
      curriculum.ts          generateCurriculum() — server-only
      questions.ts           generateQuestions() — server-only
    auth.ts                  NextAuth config with DrizzleAdapter + Credentials
    auth.config.ts           Route protection (protects /dashboard, /generate, /learn — not /courses)
    dal.ts                   verifySession(), getOptionalSession(), getUser()
    db/
      index.ts               Drizzle client (neon-http)
      schema.ts              All table definitions + relations
    youtube/
      search.ts              searchYouTubeVideo() — server-only
      transcript.ts          fetchTranscript() — server-only
    definitions.ts           Zod schemas
    mail.ts                  sendPasswordResetEmail() via Resend
  types/
    next-auth.d.ts           Session type augmentation
  emails/
    reset-password.tsx       Branded HTML email template
proxy.ts                     Next.js 16 middleware
```

### Database Schema

```
users
  id, email, password (bcrypt), displayName, name, image, emailVerified, createdAt

accounts, verificationTokens           (Auth.js adapter tables)

passwordResetTokens
  id, email, token, expires

video_cache                            [v2 — new]
  youtubeVideoId (PK), title, durationSeconds
  transcriptText, transcriptStatus ("available" | "unavailable")
  fetchedAt

courses
  id, creatorId → users.id, title, topic, description
  lengthPreset               "quick" | "standard" | "long"
  visibility                 "public" | "private"
  status                     "generating" | "ready" | "error"
  createdAt

lessons
  id, courseId → courses.id, position (0-indexed), topic
  youtubeVideoId → video_cache.youtubeVideoId (nullable, FK set null on delete)
  createdAt
  [REMOVED in v2: videoTitle, videoDurationSeconds, transcriptCached, transcriptStatus]

questions
  id, lessonId → lessons.id, position
  setIndex (int, default 0 — 0=original, 1+=on-demand)   [v2]
  questionText, options (TEXT JSON), correctIndex
  createdAt

question_flags                         [v2 — new]
  id, questionId → questions.id, userId → users.id
  flaggedAt
  UNIQUE (questionId, userId)

course_completions                     [v2 — new]
  id, userId → users.id, courseId → courses.id
  completedAt
  UNIQUE (userId, courseId)

userProgress
  id, userId → users.id, courseId → courses.id, lessonId → lessons.id
  passedQuiz (bool), completedAt, createdAt
  UNIQUE (userId, lessonId)
```

### Drizzle Relations

- `lessonsRelations`: `videoCache` (one), `course` (one — required for `with:{ lessons }` on courses)
- `coursesRelations`: `creator` (one → users), `lessons` (many)
- `usersRelations`: `courses` (many)

---

## Key Flows

### Auth Session Flow
1. `proxy.ts` runs on every request
2. `auth.config.ts` `authorized()` protects `/dashboard`, `/generate`, `/learn` — not `/courses`
3. Server Components call `verifySession()` (redirects to login) or `getOptionalSession()` (returns null) from `dal.ts`

### Course Generation Pipeline
1. User submits topic + lengthPreset
2. `generateCourse` Server Action:
   - Inserts `courses` row with `status: "generating"`
   - Calls `generateCurriculum` → Groq → ordered lesson topics
   - Inserts lesson stubs
   - Parallel `Promise.all` per lesson:
     - `searchYouTubeVideo` → YouTube Data API v3
     - **Check `video_cache`** before fetching transcript (v2)
     - Cache miss: `fetchTranscript` → insert `video_cache` row
     - `generateQuestions` → Groq → 5 questions (setIndex=0)
     - Updates `lessons.youtubeVideoId`; inserts questions
   - Sets `status: "ready"`

### Quiz Gate Flow (updated v2)
1. Learner opens lesson → `submitQuiz(lessonId, answers, setIndex)`
2. Grades only questions with matching `setIndex`
3. On pass: updates `userProgress`; checks all lessons passed → writes `courseCompletions` if complete
4. Returns `{ passed, score, courseCompleted? }`

### Creator Fix Flows (v2)
- **Swap Video:** `swapVideo(lessonId, query)` — searches YouTube, populates cache, deletes old questions, inserts new
- **Retry Questions:** `retryQuestions(lessonId)` — re-fetches transcript, updates cache, regenerates questions
- **Delete Lesson:** `deleteLesson(lessonId)` — deletes lesson+questions+progress, renumbers siblings

---

## Active Decisions

### Framework
- App Router only. `searchParams` in Next.js 16 is a `Promise` — always `await searchParams`.
- `turbopack: { root: __dirname }` in `next.config.ts`

### Database
- Neon HTTP driver (`@neondatabase/serverless`)
- `db/index.ts` placeholder fallback for `next build`; throws at runtime if `DATABASE_URL` unset
- `npm run db:push` after any schema change

### Auth
- JWT sessions — no sessions table
- `/courses` removed from `protectedRoutes` in `auth.config.ts` — course detail page uses `getOptionalSession()` and handles its own access control (private courses return 404 to non-owners)

### LLM
- `generateObject` with Zod schema always
- Groq `meta-llama/llama-4-scout-17b-16e-instruct` (structured outputs, cheap)
- LLM calls server-only

### Video Cache (v2)
- `video_cache` table is append-only in normal operation; `retryQuestions` updates it in-place
- `lessons.youtubeVideoId` FK has `onDelete: "set null"` — cache rows are never deleted
- `onConflictDoNothing` on insert guards against race conditions in parallel generation

### Catalog (v2)
- `unstable_cache` with 60s revalidation wraps the public courses query
- In-memory filtering on the cached result — avoids per-request DB hits
- `coursesRelations` + `usersRelations` required for `with: { creator, lessons }` in catalog query
- `lessonsRelations.course` back-reference required for Drizzle to resolve `courses.lessons` many relation

---

## Known Pitfalls

- **`signIn()` must be called outside try/catch in signup** — it throws a redirect.
- **`db/index.ts` placeholder** — intentional for build time.
- **DrizzleAdapter in proxy.ts** — `auth.ts` cannot be imported in `proxy.ts`; use `auth.config.ts`.
- **`options` is TEXT** — `JSON.parse(q.options)` always wrapped in try/catch.
- **`jose` is still installed** but unused.
- **YouTube captions** — transcript unavailable for many videos; questions generated from title/topic as fallback.
- **Enum validation in Server Actions** — always do explicit string checks on `formData` values.
- **`lessonsRelations` must include `course: one(courses)`** — Drizzle needs both sides of a `many()` relation or `with: { lessons }` on courses throws "not enough information to infer relation".

---

## Open Blockers / Pre-Launch Actions

| Item | Detail |
|------|--------|
| Resend sender domain | Using `onboarding@resend.dev`. Swap to verified custom domain before production. |
| YouTube captions OAuth | `captions.download` requires OAuth. Transcript fallback currently in use. |
| esbuild vulnerability | `esbuild ≤0.24.2` via `drizzle-kit` (GHSA-67mh-4wv8-2f99, dev-only). See `SECURITY-DEFERRED.md`. |

---

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `DATABASE_URL` | Runtime | Neon Console → Connection (pooled) |
| `AUTH_SECRET` | Runtime | `openssl rand -base64 32` |
| `YOUTUBE_API_KEY` | Runtime | Google Cloud Console → YouTube Data API v3 |
| `GROQ_API_KEY` | Runtime | console.groq.com → API Keys |
| `RESEND_API_KEY` | Runtime | resend.com → Dashboard |
| `NEXT_PUBLIC_APP_URL` | Runtime | `http://localhost:3000` for dev; production URL for prod |

---

## v3 Backlog

- Monetization: subscription tiers, private course paywall, creator payouts
- LLM tier system: Scout (free) → Maverick (pro) → R1-chain (premium)
- Social sharing: `/complete?userId=...` with named completion verification
- Creator analytics: flag resolution workflow, completion rates per lesson
- OAuth login (Google)
- Subject-area filter on catalog
