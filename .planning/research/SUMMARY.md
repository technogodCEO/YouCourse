# Project Research Summary

**Project:** YouCourse
**Domain:** YouTube-sequenced learning platform with AI-gated comprehension
**Researched:** 2026-05-30
**Confidence:** HIGH (stack and architecture); MEDIUM (features and pitfall mitigations)

## Executive Summary

YouCourse is a platform that lets creators sequence YouTube videos into structured courses where learners must pass AI-generated comprehension quizzes before advancing to the next video. This is a full-stack web application with three distinct subsystems: a YouTube ingestion pipeline (fetch metadata + captions + generate questions), a learner progression engine (quiz gate + progress tracking), and a creator authoring surface (URL sequence → publish). The recommended approach builds all three subsystems in strict dependency order — infrastructure and ingestion first, then the gated learner flow, then the creator and catalog surfaces — because the quiz and player features are impossible to build or test without a functioning ingestion pipeline that populates the question cache.

The recommended stack is Next.js 16 (App Router) + TypeScript + Drizzle ORM + PostgreSQL (Neon) + Auth.js v5 + Vercel AI SDK with gpt-4o-mini. Server Actions handle LLM calls and quiz submission without exposing API keys; Server Components handle catalog and course pages without client-side fetch waterfalls; Drizzle's edge-compatible design works with serverless Postgres. The ingestion architecture follows a strict "fetch once, cache everything" rule: all YouTube API and LLM calls happen exclusively at course creation time, never when a student views a course. This protects against YouTube quota exhaustion and ensures sub-100ms responses from the local database.

The two highest-risk areas are YouTube transcript availability and LLM hallucination. A significant fraction of real-world YouTube videos either lack captions or have auto-captions of insufficient quality. If the platform silently generates questions from video titles alone when transcripts are missing, hallucinated questions will destroy learner trust in the core mechanic. Both risks must be addressed in Phase 2 (ingestion) before any quiz feature is built. The gating mechanic is the product's primary differentiator; if it can be bypassed by client manipulation or produces wrong correct answers, the entire value proposition collapses. Server-side score evaluation and transcript-grounded prompts are non-negotiable from day one.

## Key Findings

### Recommended Stack

The stack is purpose-built for this use case. Next.js 16 App Router eliminates the need for a separate backend: Server Actions handle auth-protected mutations (quiz submission, course creation, ingestion triggering) and keep API keys server-side; Server Components render the catalog and course detail pages with SSR; the `use cache` directive controls stale-while-revalidate caching for course listings. Drizzle ORM is preferred over Prisma specifically because it is edge-compatible and has no native binary — critical for Neon's serverless Postgres driver. Auth.js v5 is the only full-featured auth library with dedicated App Router support and an active Drizzle adapter. The Vercel AI SDK's `generateObject` with a Zod schema is the correct abstraction for LLM question generation: it produces validated, typed JSON question arrays in a single server-side call, never touching the client bundle.

**Core technologies:**
- **Next.js 16 (App Router):** Full-stack framework — Server Actions + Server Components eliminate the need for a separate API service in v1
- **TypeScript 5.x:** Type safety — catches data-shape mismatches between DB, LLM responses, and UI; critical for quiz state machines
- **PostgreSQL 16 (Neon) + Drizzle ORM:** Primary database + ORM — relational model fits course→video→question→progress hierarchy; Drizzle is edge-compatible and schema-migrated via drizzle-kit
- **Auth.js v5:** Authentication — the only full-featured auth library with App Router support; handles email/password + OAuth with a Drizzle adapter
- **Vercel AI SDK 4.x + gpt-4o-mini:** LLM abstraction + model — `generateObject` with Zod produces validated quiz questions server-side; provider-agnostic
- **Tailwind CSS 4.x:** Styling — zero-config, CSS-first, 3.78x faster builds than v3; mobile-responsive from day one
- **@next/third-parties (YouTubeEmbed):** Lazy-loading YouTube player — avoids blocking page paint; swap for `react-youtube` if minimum watch-percentage enforcement is required
- **Zod 3.x:** Schema validation — validates LLM output shapes, form inputs, and API response parsing

### Expected Features

The core user story: creator pastes YouTube URLs → platform generates comprehension questions from transcripts → learner watches videos and must pass quizzes to advance. Every other feature either enables this mechanic or makes it discoverable.

**Must have (table stakes):**
- User auth (sign up, log in, log out) — identity required before anything else works
- Course creation: paste URL sequence → fetch metadata → batch AI question generation → publish
- Sequential video player with must-pass comprehension gate — the core learning mechanic
- Progress tracking (which videos completed, current position) — resume support
- Public course catalog — discovery surface for learners
- Course detail page with enrollment action — evaluate and enter a course
- Public/private visibility toggle — basic access control
- Mobile-responsive layout throughout — non-negotiable per PROJECT.md

**Should have (competitive differentiators):**
- AI-generated comprehension questions grounded in transcript content — the product's moat; no other YouTube playlist tool does this
- Hard gate (cannot proceed without passing) — distinguishes from skippable quizzes on Coursera/Udemy
- "More questions" from cached question pool — additional practice without extra LLM cost
- Provable completion record — basis for future certificates; learners earn it by passing every gate

**Defer (v2+):**
- Completion certificates and shareable proof — add when learners ask "what do I get?"
- Creator course editing (reorder, unpublish, replace video) — add when creators report immutable courses as a blocker
- Catalog search and filter — add when catalog has enough courses to need navigation
- Question quality feedback (flag bad question) — add when AI quality complaints surface at scale
- YouTube playlist bulk import — requires async job queue; add when consistently requested
- Creator analytics, paywall/monetization, native mobile app — explicitly v2+

### Architecture Approach

The architecture follows three strict layers: a client layer (Catalog UI, Course View, Creator Studio), an API/service layer (Auth, Course Service, Ingestion Service), and a data layer (Users, Courses, Progress, Cache). The most important architectural decision is the ingestion pipeline pattern: all YouTube Data API v3 and LLM calls happen exactly once at course creation and results persist to PostgreSQL. At student view time, zero external API calls are made. Gate enforcement is always server-side — the client sends answers, the server evaluates against stored correct indices, the server writes the unlock record.

**Major components:**
1. **Ingestion Pipeline** (`lib/ingestion/`) — orchestrates YouTube metadata fetch → caption fetch → LLM question generation → DB upsert; critical path item that all other features depend on
2. **Gate/Progress Service** (`lib/progress/`) — pure server-side logic: evaluates quiz score against pass threshold, writes unlock state to DB; never trusts client-reported scores
3. **Course View + IFrame Player** (`components/player/`) — client component; listens for `onStateChange: ENDED` + highWaterMark fallback; surfaces quiz from local DB; posts answers to server
4. **Creator Studio** (`app/dashboard/courses/`) — form-driven builder backed by Server Actions; triggers ingestion per video; polls ingestion status before enabling publish
5. **Catalog + Course Detail** (`app/(public)/`) — Server Components for SEO-friendly rendering; queries course DB directly without an HTTP hop

### Critical Pitfalls

1. **Transcript unavailability** — A significant share of YouTube videos have no usable captions. Silently proceeding causes the LLM to hallucinate questions from the video title alone. Fix: surface per-video transcript status (`available | auto_only | unavailable`) during course creation and block or warn the creator before question generation runs.

2. **LLM hallucination** — Questions generated without grounding in transcript text will have wrong correct answers. Fix: include verbatim transcript excerpts in the prompt, set temperature to ≤0.2, require `transcript_excerpt` in the output schema, validate questions are answerable from the stored excerpt.

3. **YouTube API quota exhaustion** — The default 10,000 units/day is easily consumed if any metadata fetch happens at student view time. Fix: enforce fetch-once-at-ingestion architecture from day one; use `videos.list` (1 unit) never `search.list` (100 units); log every API call with its unit cost.

4. **Client-side gate enforcement** — Any quiz gate logic in React state can be bypassed with DevTools. Fix: score evaluation and unlock writes are server-side only; the API route recalculates from stored answer keys; the next video's route checks unlock state server-side on direct navigation.

5. **Predictable course IDs enabling private content enumeration** — Integer primary keys (`/course/42`) allow logged-in users to enumerate private courses. Fix: use UUIDs or nanoid slugs for all course URLs before any course data is persisted; add integration test that User B cannot access User A's private course via the API.

## Implications for Roadmap

Based on the architecture's explicit build-order dependency chain and the pitfall phase mapping:

### Phase 1: Foundation — DB Schema, Auth, and Project Scaffold

**Rationale:** Auth is required by every protected operation; DB schema is required by auth (session tables) and ingestion. UUID/nanoid IDs for courses must be chosen before any course data exists — changing after migration is painful. This phase has no external dependencies and no quota risk.
**Delivers:** Running Next.js project with Drizzle schema, Auth.js email+Google auth, protected routes, and session middleware.
**Addresses:** User auth (table stakes); UUID course ID scheme (Pitfall 7 prevention)
**Avoids:** Integer primary key privacy leak (Pitfall 7) — ID scheme decided here cannot be revisited later without a data migration

### Phase 2: Ingestion Pipeline — YouTube Fetch + LLM Question Generation

**Rationale:** Highest-risk phase and the critical path item. No quiz, no player, no gate can be built without questions in the DB. Transcript unavailability (Pitfall 1), quota architecture (Pitfall 2), hallucination prevention (Pitfall 3), LLM cost runaway (Pitfall 6), and stale questions (Pitfall 8) must all be addressed here. The pipeline should be testable via a script or API call before any UI is built.
**Delivers:** Server-side pipeline: paste YouTube video ID → fetch metadata + captions → generate Zod-validated questions with `transcript_excerpt` → persist to DB with `transcript_status` and `transcript_hash`. LLM chunking guard for long transcripts. Per-video ingestion status field. Cost and quota logging.
**Uses:** YouTube Data API v3, Vercel AI SDK + gpt-4o-mini, Drizzle ORM
**Avoids:** Pitfalls 1, 2, 3, 6, 8

### Phase 3: Creator Studio — Course Builder and Publish Flow

**Rationale:** Now that ingestion works, creators can build courses. The Builder UI triggers ingestion per video and surfaces per-video transcript status warnings. Course creation must be rate-limited and must use async status polling (not synchronous blocking) because ingestion takes 10-30+ seconds per video.
**Delivers:** Protected creator dashboard; form to add YouTube URLs; per-video ingestion status display; publish with public/private toggle. Course IDs are UUIDs. Rate-limiting on course creation endpoint.
**Addresses:** Course creation (P1 feature), public/private toggle, creator UX pitfalls (no silent failure on question generation)
**Avoids:** Synchronous HTTP timeout on creation; double-submission on retry

### Phase 4: Learner Flow — Sequential Player, Quiz Gate, and Progress

**Rationale:** Core product mechanic. Depends on Phases 1-3 having populated courses with questions. The gate must be server-side only. Attempt tracking and the question flag button belong in this phase — lock-out recovery (Pitfall 4) is part of the gate mechanic, not a polish task.
**Delivers:** Course detail page; enrollment action; sequential video list with locked/current/completed state; YouTube IFrame player with ENDED + highWaterMark triggers; quiz panel (one question at a time); server-side score evaluation; unlock-next on pass; retry on fail; attempt count tracking; question flag button; progress persisted to DB. "More questions" from cached pool (read-only, no new LLM call against YouTube data).
**Addresses:** Sequential video player, must-pass gate, enrollment, progress tracking, more questions (all P1 features)
**Avoids:** Pitfall 4 (lock-out with no recovery); client-side gate bypass; iOS Safari IFrame unreliability

### Phase 5: Public Catalog and Course Discovery

**Rationale:** Catalog requires published courses to exist (Phase 3) and shows only `visibility = public` courses. This is a Server Component page with a direct DB query — straightforward once the course data model is established.
**Delivers:** Public catalog page (Server Component, SSR); course card grid; course detail page for unauthenticated users; enrollment entry point.
**Addresses:** Course catalog, course detail page (P1 features)
**Uses:** Visibility-driven query filtering pattern from ARCHITECTURE.md

### Phase 6: Hardening — Video Availability Monitoring, Mobile QA, and Security Audit

**Rationale:** Ship-readiness phase. Video deletion/privacy change (Pitfall 5) needs a background availability checker before launch. iOS Safari IFrame API reliability issues must be tested explicitly. Security checklist must be verified.
**Delivers:** Background job checking video availability daily for all published courses; graceful "video unavailable" UI suspending gate for that video; in-app creator notification when a video goes private. Full mobile QA pass. Security integration tests (private course access, quiz score manipulation).
**Addresses:** Pitfall 5 (video deletion), mobile IFrame reliability, "Looks Done But Isn't" checklist from PITFALLS.md

### Phase Ordering Rationale

- Schema and auth must precede everything because both ingestion and the learner flow need session identity and stable table definitions.
- Ingestion precedes the Creator Studio UI because the UI is just a trigger — without a working pipeline, the UI has nothing meaningful to test.
- The learner flow precedes the public catalog because you need the core mechanic validated before worrying about discovery.
- Hardening is last because it addresses failure modes that cannot be fully tested until real courses and learners exist.
- "More Questions" is delivered in Phase 4 — it reads from the cached question pool built in Phase 2; it is a DB GET, not a new integration.

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 2 (Ingestion):** YouTube captions API authentication requirements (OAuth vs API key for `captions.download`) should be verified against current Google Cloud Console docs before implementation. Whether the official Captions API or an alternative transcript approach is needed must be confirmed — STACK.md notes scraping libraries are against ToS.
- **Phase 4 (Gate):** iOS Safari IFrame API workarounds for `onStateChange` reliability should be validated against current Apple WebKit behavior at implementation time.
- **Phase 6 (Background Jobs):** Background/scheduled job infrastructure on Vercel (Cron Functions vs Inngest vs BullMQ+Redis) was not covered in research; evaluate at Phase 6 planning.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Auth + Schema):** Auth.js v5 + Drizzle adapter documented in Next.js official docs; well-established pattern.
- **Phase 3 (Creator Studio):** Standard Server Action form pattern; straightforward once ingestion works.
- **Phase 5 (Catalog):** Server Component + direct DB query; simplest possible pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16, Auth.js v5, Tailwind v4 verified against official docs updated 2026-05-28. Drizzle and Vercel AI SDK at MEDIUM on exact versions (web access blocked) but community consensus is strong. |
| Features | MEDIUM | Feature analysis based on training knowledge of competitors through Aug 2025; web search unavailable. Core feature set is well-grounded in PROJECT.md requirements. Competitor claims should be spot-checked. |
| Architecture | HIGH | YouTube Data API v3 and IFrame API are stable, well-documented. Next.js App Router patterns are from official docs. Architecture patterns (fetch-once, server-side gate) are established and non-controversial. |
| Pitfalls | HIGH | Transcript unavailability, quota exhaustion, and LLM hallucination are well-documented failure modes with established mitigations. iOS Safari IFrame issues confirmed in developer documentation. |

**Overall confidence:** HIGH — the research provides enough clarity to produce a detailed roadmap. The two MEDIUM areas (feature competitor analysis and exact package versions) do not block planning.

### Gaps to Address

- **YouTube caption access method:** Whether `captions.download` requires OAuth (creator-authorized) or works with a standard API key for auto-captions is not definitively resolved. If OAuth is required, course creation needs a YouTube account connection step — a significant UX change. Validate before designing the ingestion API surface in Phase 2 planning.
- **"More Questions" LLM call:** ARCHITECTURE.md notes the PROJECT.md claim "no new API call" for extra questions likely means no new YouTube API call, but the LLM IS called. This interpretation must be confirmed with the project owner before implementing the More Questions feature.
- **Pass threshold configuration:** PITFALLS.md recommends 70% hardcoded for MVP with per-course config deferred. Roadmap should explicitly flag this as a post-launch configuration feature.
- **Ingestion job architecture:** Synchronous HTTP ingestion will time out for courses with many videos. Whether to use Vercel Cron Functions, Inngest, or BullMQ+Redis is an unresolved infrastructure decision that affects Phase 2 and Phase 6 scope.

## Sources

### Primary (HIGH confidence)
- Next.js official docs (v16.2.6, updated 2026-05-28) — App Router patterns, auth library list, `@next/third-parties` YouTubeEmbed, caching model
- YouTube Data API v3 documentation — quota unit costs, resource types, `videos.list` vs `search.list`
- YouTube IFrame Player API reference — `onStateChange` events, `getCurrentTime`, known mobile issues
- Tailwind CSS v4 blog post (Jan 2025) — v4.0 stable confirmation, performance numbers

### Secondary (MEDIUM confidence)
- Vercel AI SDK docs — `generateObject` with Zod schemas; web access blocked during research, based on training knowledge of v4 architecture
- Drizzle ORM docs — edge compatibility, drizzle-kit migrations; web access blocked, based on training knowledge
- Auth.js v5 — listed by name in Next.js 16 official auth docs; exact v5 semver not independently verified
- Platform feature analysis — Coursera, Udemy, Khan Academy, edX, Teachable, Thinkific (training knowledge through Aug 2025)

### Tertiary (LOW confidence)
- YouTube Data API v3 caption quota costs (50 units for `captions.list`, 200 for `captions.download`) — verify against Google Cloud Console quota documentation before implementation
- YouTube transcript availability rate — qualitative assessment from community sources; no quantitative data available

---
*Research completed: 2026-05-30*
*Ready for roadmap: yes*
