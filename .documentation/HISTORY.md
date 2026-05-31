# Plan History

Chronological record of all executed plans, including key decisions and deviations. Active plans live in `.planning/`.

---

## SEC-01 — Security Hardening (2026-05-31)

**Branch:** `claude/dreamy-cori-FLgjM` | **PR:** #1

Addressed 14 findings from a full security audit. No critical auth vulnerabilities were found — the auth layer was solid. Issues were business logic, input validation, LLM output handling, and config hygiene.

### Findings Fixed

| ID | Severity | Fix |
|----|----------|-----|
| H-1 | High | `submitQuiz` no longer returns correct answer key — returns `wrongIndexes` on failure only |
| H-2 | High | `initProgress` verifies course exists, is `ready`, and is accessible before inserting progress rows |
| H-3 | High | `generateCourse` enforces 200-char max on topic |
| H-4 | High | `lengthPreset` and `visibility` validated against allowed enum values at runtime |
| H-5 | High | `curriculum.ts` and `questions.ts` migrated from `generateText` + regex + `JSON.parse` to `generateObject` with Zod schemas |
| M-1 | Medium | `submitQuiz` verifies lesson's parent course is accessible to the session user |
| M-2 | Medium | `skipLesson` server-side guard: only permits skip when `lesson.youtubeVideoId === null` |
| M-3 | Medium | `courses/[courseId]/page.tsx` calls `verifySession()` before DB fetch |
| M-4 | Medium | `JSON.parse(q.options)` wrapped in try/catch with array shape validation; malformed questions skipped rather than crashing page |
| M-5 | Medium | `searchYouTubeVideo` and `db/index.ts` throw on missing env vars at startup |
| L-1 | Low | Password Zod schema gains `.max(72)` to match bcrypt truncation limit |
| L-2 | Low | Deleted dead `src/lib/session.ts` (`encrypt`/`decrypt` were never called) |
| I-2 | Info | CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` headers added in `next.config.ts` |
| I-3 | Info | `db/index.ts` throws at runtime if `DATABASE_URL` unset |

**Deferred:** L-4 (`esbuild` GHSA-67mh-4wv8-2f99 via `drizzle-kit`) — dev-only, fix requires breaking drizzle-kit downgrade. See `SECURITY-DEFERRED.md`.

---

## Phase 04 — Learner Flow

**Plan:** 04-01

**Goal:** Learners open a course via direct link, watch videos sequentially, pass comprehension quizzes to unlock the next video, and resume from where they left off — all gate logic server-side.

**Files created/modified:**
- `src/app/learn/[courseId]/page.tsx` — course overview, lesson list with lock state
- `src/app/learn/[courseId]/[lessonId]/page.tsx` — lesson page with prior-lessons gate
- `src/components/learn/video-player.tsx`, `quiz.tsx`, `skip-lesson-button.tsx`, `lesson-player.tsx`
- `src/actions/submit-quiz.ts`, `init-progress.ts`, `skip-lesson.ts`

**Requirements completed:** LRNN-01, LRNN-03, LRNN-04, LRNN-05, LRNN-06, LRNN-07

**Key decisions:**
- Quiz gate evaluated server-side on lesson page load — prior lessons checked via `userProgress` before rendering
- `react-youtube` `onStateChange` used to detect video end and reveal quiz
- `skipLesson` action available for lessons with no YouTube video (transcript unavailable)
- Progress initialised via `initProgress` when user first opens a course

---

## Phase 03 — Course Creation & Publishing

**Plan:** 03-01

**Goal:** Logged-in user can generate a course by entering a topic and length, then publish it for learners to access via direct link.

**Files created/modified:**
- `src/app/dashboard/page.tsx` — lists user's created courses with status
- `src/app/generate/page.tsx`, `loading.tsx`
- `src/app/courses/[courseId]/page.tsx`, `edit/page.tsx`
- `src/components/course/generate-form.tsx`, `edit-course-form.tsx`, `course-poller.tsx`, `delete-course-button.tsx`, `copy-link-button.tsx`
- `src/actions/update-course.ts`, `delete-course.ts`

**Requirements completed:** CGEN-01, CGEN-06, CGEN-07

**Key decisions:**
- Course generation runs server-side in `generateCourse` action; page polls via `CoursePoller` component until status is `ready`
- Visibility (`public`/`private`) set on edit page post-generation; defaults to `private`
- Delete requires ownership check (`creatorId === session.userId`)

---

## Phase 02 — AI Ingestion Pipeline

### 02-02 — Pipeline Implementation

**Goal:** Given a topic and length, system automatically generates curriculum, finds YouTube videos, and produces comprehension questions — all persisted before any student sees the course.

**Files created/modified:**
- `src/lib/ai/curriculum.ts` — LLM curriculum generation
- `src/lib/ai/questions.ts` — LLM question generation
- `src/lib/youtube/search.ts` — YouTube Data API v3 video search
- `src/lib/youtube/transcript.ts` — caption/transcript fetch
- `src/actions/generate-course.ts` — orchestrates full pipeline
- `package.json` — added `ai`, `@ai-sdk/groq`, `react-youtube`

**Requirements completed:** CGEN-02, CGEN-03, CGEN-04, CGEN-05

**Key decisions:**
- Switched from OpenAI `gpt-4o-mini` (originally planned) to Groq `llama-3.3-70b-versatile` — faster, free for development
- `react-youtube` chosen over `@next/third-parties/youtube` for programmatic player state required by the quiz gate
- Lessons processed in parallel (`Promise.all`) with per-lesson error isolation — one failed video doesn't abort the course
- Questions generated from video title + topic when transcript unavailable (YouTube captions require OAuth for download — unresolved, see STATE.md blockers)
- Question options stored as JSON string in TEXT column (validated on read after SEC-01)

### 02-01 — Schema Extensions

**Goal:** Add the four tables needed by the pipeline and learner flow; add API keys to environment.

**Files modified:** `src/lib/db/schema.ts`, `.env.example`

**Tables added:** `courses`, `lessons`, `questions`, `user_progress`

**Key decisions:**
- `options` column on `questions` is `text` containing a JSON array — kept simple for v1
- `user_progress` has a unique constraint on `(userId, lessonId)` — `onConflictDoNothing` used in `initProgress`
- `transcriptStatus` on `lessons`: `pending` → `unavailable` (no separate `ready` state; questions inserted separately)
- `OPENAI_API_KEY` replaced by `GROQ_API_KEY` in env when LLM provider was switched

---

## Phase 01 — Foundation

### 01-03 — Password Reset Flow (2026-05-30)

**Goal:** Single-use token password reset via Resend email.

**Files created:**
- `src/emails/reset-password.tsx` — branded HTML email (inline styles, accent CTA)
- `src/lib/mail.ts` — `sendPasswordResetEmail(email, token)`
- `src/actions/password-reset.ts` — `requestPasswordReset` + `applyPasswordReset`
- `src/components/auth/forgot-password-form.tsx`, `reset-password-form.tsx`
- `src/app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx`

**Requirements completed:** AUTH-03

**Key decisions:**
- Token TTL: 1 hour. Single active token per email — prior tokens deleted on new request. Token deleted immediately after successful reset.
- `requestPasswordReset` always returns the same success-style message regardless of whether the account exists — prevents email enumeration
- Resend sender is `onboarding@resend.dev` for dev. **Must swap to a verified custom domain before production** (see STATE.md blockers)
- `bcrypt` cost factor 12 — consistent with signup action
- Next.js 16 `searchParams` is a Promise — reset page uses `await searchParams`

### 01-02 — Auth Flows (2026-05-30)

**Goal:** Sign-up, login, logout, protected dashboard, route protection.

**Files created:**
- `src/actions/auth.ts` — `signup`, `login`, `logout` Server Actions
- `src/components/auth/signup-form.tsx`, `login-form.tsx`, `logout-button.tsx`
- `src/app/(auth)/layout.tsx`, `signup/page.tsx`, `login/page.tsx`
- `src/app/dashboard/page.tsx` — protected placeholder
- `proxy.ts` — Auth.js v5 `auth()` wrapper for edge route protection

**Requirements completed:** AUTH-01, AUTH-02, AUTH-04

**Key decisions:**
- `proxy.ts` uses the `auth((req) => ...)` wrapper — JWT verification does not hit the DB (DrizzleAdapter is only involved in OAuth account creation, not session reads)
- Authenticated users redirected away from `/login` and `/signup` only — not all public routes (prevents redirect loop on `/forgot-password`)
- `logout-button.tsx` implemented as a Server Component with `<form action={logout}>` — no `'use client'` needed
- `signup` calls `signIn()` outside the try/catch so the redirect exception propagates correctly

**Deviations:**
- Removed unused `publicRoutes` array from `proxy.ts` — documented the public routes in a comment instead

### 01-01 — Foundation Scaffold (2026-05-30)

**Goal:** Next.js scaffold, Drizzle schema, Auth.js v5 config, session/DAL foundation.

**Files created:**
- `src/lib/db/schema.ts` — `users`, `accounts`, `verificationTokens`, `passwordResetTokens`
- `src/lib/db/index.ts` — Drizzle neon-http client
- `src/lib/auth.ts` — `handlers`, `signIn`, `signOut`, `auth`
- `src/lib/definitions.ts` — `SignupSchema`, `LoginSchema`, `FormState`
- `src/lib/dal.ts` — `verifySession()`, `getUser()`
- `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`
- `drizzle.config.ts`, `.env.example`

**Requirements completed:** AUTH-01 (partial — schema foundation)

**Key decisions:**
- `db/index.ts` uses `neon()` with placeholder fallback so `next build` succeeds without `DATABASE_URL` at static analysis time; throws at runtime if unset (hardened further in SEC-01)
- `z.string().email()` used instead of `z.email()` — v3-compatible API, works reliably in Zod v4
- `turbopack: { root: __dirname }` added to `next.config.ts` to silence workspace root detection warning
- Scaffolded via temp directory (`youcourse-tmp`) since project root was non-empty; preserved `public/images/YouCourseLogo.png`
- `jose` installed for JWT crypto (`session.ts`) but found unused — `session.ts` removed in SEC-01

**Packages installed:** `next@16.2.6`, `next-auth@^5.0.0-beta.31`, `@auth/drizzle-adapter`, `drizzle-orm@^0.45.2`, `@neondatabase/serverless`, `drizzle-kit@^0.31.10`, `bcryptjs@^3.0.3`, `resend@^6.12.4`, `zod@^4.4.3`, `server-only`

**Deviations:**
- Build failed without `DATABASE_URL` at static analysis phase — fixed with placeholder fallback in `db/index.ts`
- `.env.example` was blocked by `.gitignore` pattern `.env*` — added `!.env.example` exception
