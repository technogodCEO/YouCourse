# YouCourse — Roadmap

## v1 — Shipped

All four phases complete. Core learning loop is live: topic → AI-generated course → gated quiz progress.

| Phase | Goal | Status |
|-------|------|--------|
| 1. Foundation | Scaffold, DB schema, email/password auth | ✅ Complete |
| 2. AI Ingestion | Curriculum gen, YouTube search, question gen | ✅ Complete |
| 3. Course Creation | Generate form, course/edit pages, dashboard | ✅ Complete |
| 4. Learner Flow | Video player, quiz engine, sequential gating | ✅ Complete |

### Phase Dependency Order
1 → 2 → 3 → 4. Auth and schema first; ingestion pipeline is the critical path (no quiz can exist without questions in the DB).

---

## v2 — In Progress

Three phases. Monetization deferred to v3. Full design spec: `docs/superpowers/specs/2026-06-01-v2-roadmap-design.md`.

### Phase 1 — Creator Pipeline Fixes

Fix AI implementation failures without second-guessing AI decisions. The product philosophy: creators don't know exactly what they need — that's why the AI builds the curriculum. v2 gives them tools to fix concrete mistakes, not override the AI's choices.

| Feature | Description |
|---------|-------------|
| Video cache | New `video_cache` table keyed by `youtubeVideoId`. Deduplicates transcript + metadata fetches when multiple courses land on the same video. |
| Swap video | Replace a bad video on one lesson — reruns YouTube search, regenerates questions from new transcript. |
| Retry questions | Re-attempt transcript fetch + question generation on lessons where transcript was unavailable at creation time. |
| Delete lesson | Remove a broken lesson; cascades to questions and progress rows. |

### Phase 2 — Learner Polish

| Feature | Description |
|---------|-------------|
| On-demand question sets | Unlimited additional question batches generated from cached transcript. Stored with `questions.setIndex` (0 = original, 1+ = on-demand). Pro gate deferred to v3. |
| Question flagging | Single-tap flag → `question_flags` table. Creators see flag counts per question. Questions stay live — creators decide what to fix. |
| Completion records | `course_completions` table written on final quiz pass. Shareable `/learn/[courseId]/complete` page. Dashboard separates completed from in-progress. |

### Phase 3 — Discovery

| Feature | Description |
|---------|-------------|
| Public catalog | `/catalog` — anonymous browsing, all `visibility = 'public'` courses, cached with short TTL. |
| Search | Postgres `ILIKE` on `courses.title` and `courses.topic`. |
| Length filter | Quick / Standard / Long chips. Subject-area filter deferred (no usage data yet). |
| SEO | `generateMetadata` on public course pages. Private pages get `noindex`. |

### v3 — Monetization (deferred)

- Private course paywall
- Creator receives payment on purchase
- Subscription tiers with tiered LLM quality (Scout free → Maverick pro → R1-chain premium)

---

## Out of Scope (v1)

| Feature | Reason |
|---------|--------|
| OAuth login | Email/password sufficient for v1 |
| Email verification on sign-up | Reduces friction; add when spam is a concern |
| Manual video URL entry | Automated curriculum+search is the core differentiator |
| YouTube playlist bulk import | Requires async job queue |
| Per-video ingestion status polling | Simplified to "generating…" then redirect |
| Creator analytics | Deferred until courses have meaningful usage |
| Completion certificates | Deferred; establish value first |
| Native mobile app | Mobile-responsive web covers v1 |
