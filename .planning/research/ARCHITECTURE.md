# Architecture Research

**Domain:** YouTube-based gated learning platform
**Researched:** 2026-05-30
**Confidence:** HIGH (well-established APIs and patterns; no web access used — based on training knowledge of YouTube Data API v3, IFrame Player API, and standard web app patterns)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client Layer (Browser)                     │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │  Catalog UI  │  │  Course View │  │  Creator Studio UI    │   │
│  │ (public browse│  │ (video +quiz)│  │  (build/publish)      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘   │
│         │                 │                      │                │
│         │          ┌──────┴───────┐              │                │
│         │          │ YT IFrame    │              │                │
│         │          │ Player API   │              │                │
│         │          └──────┬───────┘              │                │
└─────────┼─────────────────┼──────────────────────┼────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API Layer (Server)                         │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Auth Service │  │Course Service│  │  Ingestion Service   │    │
│  │(session/JWT) │  │(progress/gate│  │(YT fetch + LLM gen)  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘    │
│         │                 │                      │                │
└─────────┼─────────────────┼──────────────────────┼────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Data Layer                                 │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐   │
│  │  Users DB  │  │ Courses DB │  │  Cache     │  │  Progress │   │
│  │(auth/prefs)│  │(videos/    │  │(transcripts│  │  DB (per- │   │
│  │            │  │ questions) │  │ /metadata) │  │  user)    │   │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘   │
└──────────────────────────────────────────────────────────────────┘
          │                                        │
          ▼                                        ▼
┌────────────────────┐              ┌──────────────────────────────┐
│  YouTube Data API  │              │  LLM API (OpenAI/Anthropic)  │
│  v3 (quota-gated)  │              │  (called once per video at   │
│                    │              │   course creation only)       │
└────────────────────┘              └──────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Catalog UI | Browse public courses, search, course detail page | Next.js server components (SEO-friendly) |
| Course View | Render video player, display quiz, enforce gate, show progress | Next.js client components (interactive) |
| Creator Studio UI | Add YouTube URLs, sequence videos, preview, publish | Client-side form with server actions |
| YT IFrame Player API | Embed video, surface playback events (ended, progress) | Loaded client-side via script tag |
| Auth Service | Sign up, log in, session validation, role check (creator vs learner) | NextAuth.js / Lucia + JWT cookies |
| Course Service | CRUD for courses, gated progression logic, quiz submission, score gate | API routes or tRPC procedures |
| Ingestion Service | Fetch YT metadata + captions once at course creation; call LLM; store everything | Background job or synchronous creation handler |
| Users DB | User accounts, roles, preferences | PostgreSQL table |
| Courses DB | Courses, video order, cached metadata, generated questions (all JSON columns) | PostgreSQL tables |
| Cache (transcripts/metadata) | Prevent redundant YouTube API calls; store raw transcript and LLM-generated questions | PostgreSQL JSONB columns or Redis |
| Progress DB | Per-user, per-course, per-video: watched status, quiz scores, unlock state | PostgreSQL table |
| YouTube Data API v3 | Authoritative source for video title, description, duration, captions | Called only during ingestion |
| LLM API | Generate multiple-choice comprehension questions from transcript text | Called once per video at creation |

## Recommended Project Structure

```
src/
├── app/                        # Next.js App Router pages and layouts
│   ├── (public)/               # Unauthenticated routes (catalog, course preview)
│   │   ├── page.tsx            # Home / catalog landing
│   │   └── courses/[slug]/     # Course detail + video player
│   ├── (auth)/                 # Auth routes (login, signup)
│   ├── dashboard/              # Creator dashboard (protected)
│   │   └── courses/            # Course builder
│   └── api/                    # API route handlers
│       ├── auth/               # NextAuth endpoints
│       ├── courses/            # Course CRUD, publish
│       ├── progress/           # Progress tracking, quiz submission
│       └── ingest/             # YouTube + LLM ingestion trigger
├── components/
│   ├── player/                 # YouTubePlayer wrapper (IFrame API)
│   ├── quiz/                   # QuizPanel, QuestionCard, ScoreGate
│   ├── catalog/                # CourseCard, CatalogGrid
│   └── builder/                # VideoItem, VideoList, CourseForm
├── lib/
│   ├── youtube/                # YouTube Data API v3 client + quota helpers
│   ├── llm/                    # LLM prompt construction, question parsing
│   ├── ingestion/              # Orchestration: fetch → generate → persist
│   ├── progress/               # Gate logic, score threshold evaluation
│   └── auth/                   # Session helpers, role checks
├── db/
│   ├── schema.ts               # Drizzle or Prisma schema
│   ├── migrations/             # DB migration files
│   └── queries/                # Typed query helpers per domain
└── types/
    └── index.ts                # Shared TypeScript types
```

### Structure Rationale

- **app/(public)/:** Course catalog and player are publicly accessible and benefit from Next.js server-side rendering for SEO. Keep these separate from authenticated routes.
- **app/api/ingest/:** Ingestion is a distinct, expensive operation. Isolating it as its own API route makes it easy to add rate-limiting, background job offloading, or webhook callbacks later.
- **lib/ingestion/:** The ingestion pipeline has three sequential steps (YouTube fetch → transcript → LLM) that are orchestrated together. Keeping orchestration in lib separate from the API route boundary allows testing without HTTP.
- **lib/progress/:** The gate logic (score >= threshold → unlock next video) is pure business logic. Isolating it makes it trivial to test and adjust the threshold without touching persistence code.
- **db/queries/:** Raw typed queries (not scattered inline) so the data layer has a single point of change when schema evolves.

## Architectural Patterns

### Pattern 1: Ingestion Pipeline (Fetch-Once, Cache-Everything)

**What:** At course creation, a single server-side pipeline fetches all necessary external data and stores it locally. No external calls happen at student view time.

**When to use:** Any time you have quota-gated or cost-gated external APIs (YouTube quota, LLM token costs).

**Trade-offs:** Creation takes longer (10-30 seconds per video); students get instant responses. Transcript/questions may be slightly stale if a YouTube video is edited, but this is acceptable for v1.

```typescript
// lib/ingestion/pipeline.ts
async function ingestVideo(youtubeVideoId: string, courseId: string) {
  // Step 1: YouTube Data API v3 — fetch once
  const metadata = await fetchYouTubeMetadata(youtubeVideoId);
  const transcript = await fetchYouTubeCaptions(youtubeVideoId);

  // Step 2: LLM — generate questions from transcript
  const questions = await generateQuestions(transcript, metadata.title);

  // Step 3: Persist everything — no external calls after this point
  await db.courseVideos.upsert({
    courseId,
    youtubeVideoId,
    metadata,          // title, duration, thumbnail
    transcript,        // raw caption text
    questions,         // array of {question, options[], correctIndex}
  });
}
```

### Pattern 2: Gate-Then-Advance (Server-Side Enforcement)

**What:** Quiz submission is validated server-side. The "unlock next video" state is written to the database only after a passing score is confirmed by the server, never by client assertion.

**When to use:** Any mechanic where the client must not be trusted to self-report completion (all gating scenarios).

**Trade-offs:** Adds a round-trip to advance; prevents client-side cheating.

```typescript
// app/api/progress/submit/route.ts
async function POST(req: Request) {
  const { courseId, videoId, answers } = await req.json();
  const userId = requireAuth(req); // throws if unauthenticated

  const questions = await db.getQuestionsForVideo(videoId);
  const score = evaluateAnswers(answers, questions);
  const passed = score >= PASS_THRESHOLD; // e.g. 0.7

  await db.progress.upsert({
    userId, courseId, videoId,
    score, passed, completedAt: passed ? new Date() : null,
  });

  if (passed) {
    await db.progress.unlockNextVideo(userId, courseId, videoId);
  }

  return Response.json({ score, passed });
}
```

### Pattern 3: Visibility-Driven Query Filtering

**What:** Course visibility (public vs private) is a DB column that gates catalog queries. Anonymous users see only `visibility = 'public'`; authenticated users see public courses plus their own private courses.

**When to use:** Whenever content has tiered access without a full RBAC system.

**Trade-offs:** Simple to implement; needs careful index on `(visibility, creatorId)` as catalog grows.

```typescript
// lib/catalog.ts
async function listCourses(userId: string | null) {
  if (userId) {
    return db.courses.findMany({
      where: { OR: [{ visibility: 'public' }, { creatorId: userId }] },
    });
  }
  return db.courses.findMany({ where: { visibility: 'public' } });
}
```

## Data Flow

### Course Creation Flow

```
Creator adds YouTube URLs in Builder UI
    ↓
POST /api/courses (create course record, status = "draft")
    ↓
POST /api/ingest (triggered per video)
    ↓
Ingestion Service:
  1. YouTube Data API v3 → video metadata (title, duration, thumbnail)
  2. YouTube Captions API → transcript text
  3. LLM API → questions array
  4. db.courseVideos.upsert() → all data persisted
    ↓
Course status → "ready" (all videos ingested)
    ↓
Creator publishes → visibility set to "public" or "private"
```

### Learner Progression Flow

```
Learner opens course → server loads course + their progress record
    ↓
Course View renders first unlocked video
    ↓
YT IFrame Player API loads video (YouTube CDN — no API quota used)
    ↓
Player emits onStateChange: ENDED event
    ↓
Client shows quiz (questions served from local DB — no API call)
    ↓
Learner submits answers → POST /api/progress/submit
    ↓
Server evaluates score against threshold
  PASS → unlock next video, return { passed: true, nextVideoId }
  FAIL → return { passed: false, score, canRetry: true }
    ↓
Client advances OR shows retry prompt
```

### "More Questions" Flow

```
Learner requests additional questions
    ↓
GET /api/courses/:id/videos/:videoId/questions?extra=true
    ↓
Server reads cached transcript from DB
    ↓
LLM API called with transcript (secondary question generation prompt)
    ↓
New questions appended to courseVideos.extraQuestions JSONB column
    ↓
Questions returned to client
```

Note: "More questions" DOES require an LLM call. The PROJECT.md says "served from cached course metadata, no new API call" — this likely means no new YouTube API call. The LLM call uses only the cached transcript. This distinction should be clarified before implementation.

### State Management (Client-Side)

```
Server (DB)
    ↓ initial load (SSR/RSC)
[course structure + progress state] → React component tree
    ↓
User actions (quiz submit, video end):
  → API call → server updates DB → response drives local state update
  → No persistent client-side state store needed for v1
  → URL encodes current video position (e.g. /courses/[slug]?v=3)
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Next.js server + single Postgres instance. Synchronous ingestion in the API handler is fine. No queue needed. |
| 1k-100k users | Move ingestion to a background job queue (BullMQ + Redis or Inngest). Catalog queries need index on `(visibility, createdAt)`. Add read replica if progress writes contend with catalog reads. |
| 100k+ users | CDN-cache catalog and course detail pages (stale-while-revalidate). Progress DB may need partitioning by userId. LLM batch costs become meaningful — reassess on-demand vs pre-generation. |

### Scaling Priorities

1. **First bottleneck:** Ingestion under concurrent course creation. Synchronous pipeline blocks the API response for 15-30+ seconds. Fix: move to async job queue (BullMQ/Inngest) and poll for completion status.
2. **Second bottleneck:** Progress table hot rows (popular courses). Fix: add composite index `(user_id, course_id, video_id)`; ensure upserts are atomic.

## Anti-Patterns

### Anti-Pattern 1: Calling YouTube API at Student View Time

**What people do:** Fetch video metadata from YouTube Data API v3 when a student opens a course to display the title, thumbnail, or duration.

**Why it's wrong:** YouTube's free quota is 10,000 units/day. A `videos.list` call costs 1 unit; at scale, even modest traffic exhausts the quota. More critically, students shouldn't depend on YouTube API availability to start watching.

**Do this instead:** Fetch metadata exactly once at ingestion and cache it in your DB. Serve all display data from your own DB. The only YouTube CDN dependency at view time is the IFrame player itself (which has no quota cost).

### Anti-Pattern 2: Client-Side Gate Enforcement

**What people do:** Let the frontend decide whether a user has passed the quiz and unlock the next video locally (e.g., check score in React state and conditionally render the next video button).

**Why it's wrong:** A user can bypass this with DevTools or by directly calling the "unlock next" endpoint. The gating mechanic is the core value proposition — compromising it undermines the product.

**Do this instead:** All unlock state lives in the database. The server evaluates the score and writes the unlock record. The client only renders what the server says is unlocked. The next video's route should also check unlock state server-side on direct navigation.

### Anti-Pattern 3: Storing Questions Only in the LLM Response

**What people do:** Generate questions at creation time and return them to the client without persisting them, assuming they can be regenerated on demand.

**Why it's wrong:** LLM outputs are non-deterministic. Regeneration costs money and time. If the same student retakes a quiz, question ordering should be stable (or stable within a seeded shuffle). Progress records reference question indices that must remain consistent.

**Do this instead:** Persist the full questions array (with correct answer indices) to the DB at ingestion time. Treat the stored questions as immutable for the lifetime of a course version.

### Anti-Pattern 4: Using IFrame Player API Events as the Sole Progress Signal

**What people do:** Only trigger the quiz when `onStateChange: ENDED` fires, assuming it reliably indicates the user watched the full video.

**Why it's wrong:** `ENDED` fires even if the user scrubs to the last second. It doesn't fire if the user closes the tab or navigates away. It can fail to fire due to browser autoplay policy or ad blockers interfering with the IFrame.

**Do this instead:** Use `ENDED` as the primary trigger, but also poll `getCurrentTime()` and store a `highWaterMark` (furthest timestamp reached). Showing the quiz can be triggered by `ENDED` OR by `highWaterMark >= (duration * 0.9)`. Server-side, don't require `ENDED` — just require quiz submission.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| YouTube Data API v3 | Server-side HTTP, called once per video at ingestion | Quota: `videos.list` = 1 unit; `captions.list` = 50 units; `captions.download` = 200 units. Budget accordingly. OAuth app key required. |
| YouTube IFrame Player API | Client-side script tag (`https://www.youtube.com/iframe_api`) | No quota cost. Loads async; must handle `onYouTubeIframeAPIReady` callback. Use `enablejsapi=1` parameter. |
| LLM API (OpenAI / Anthropic) | Server-side HTTP POST, called once per video at ingestion | Use structured output (JSON mode) for reliable question parsing. Prompt should specify question count, format, and difficulty. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Course View UI ↔ Progress API | REST POST on quiz submit | Response drives unlock; keep payload small (videoId, answers array) |
| Builder UI ↔ Ingestion API | REST POST; poll or SSE for status | Ingestion is slow; don't block UI; show per-video progress |
| Catalog page ↔ Course DB | Server component direct DB query (no API hop) | Avoids unnecessary HTTP round-trip for SSR |
| Course View ↔ Course DB | Server component for initial load; client fetches for quiz answers | Hybrid: SSR for structure, CSR for interactions |
| Progress Service ↔ Gate Logic | In-process function call (not microservice) | Gate logic is pure computation; no network boundary needed in v1 |

## Build Order (Dependency Chain)

The component dependency graph determines phase ordering. Each layer depends on the layer above it being complete.

```
1. DB Schema (users, courses, courseVideos, progress)
        ↓
2. Auth (session required by all protected operations)
        ↓
3. Ingestion Pipeline (YouTube fetch + LLM + cache — no UI needed to test)
        ↓
4. Course Builder UI (depends on ingestion + auth)
        ↓
5. Course Catalog (depends on published courses existing)
        ↓
6. Course View + IFrame Player (depends on courseVideos data existing)
        ↓
7. Quiz + Gate Logic (depends on questions existing + progress schema)
        ↓
8. Progress Tracking UI (depends on gate logic + progress DB writes)
```

Nothing in step 6+ can be built without step 3 (ingestion) being functional, because the questions and metadata that the quiz relies on only exist after ingestion runs. This makes ingestion an early critical path item despite being invisible to the end user.

## Sources

- YouTube Data API v3 documentation (https://developers.google.com/youtube/v3/docs) — quota unit costs and resource types. Confidence: HIGH (stable API, knowledge from training).
- YouTube IFrame Player API reference (https://developers.google.com/youtube/iframe_api_reference) — player events including `onStateChange`, `getCurrentTime`. Confidence: HIGH (stable API).
- Standard Next.js App Router patterns — server components for SSR, client components for interactive state. Confidence: HIGH.
- General LLM integration patterns (structured output / JSON mode) — Confidence: HIGH for concept; specific API syntax should be verified against current OpenAI/Anthropic docs at implementation time.

---
*Architecture research for: YouCourse — YouTube-based gated learning platform*
*Researched: 2026-05-30*
