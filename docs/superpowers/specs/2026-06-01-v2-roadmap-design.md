# YouCourse v2 Roadmap Design

**Date:** 2026-06-01
**Horizon:** 3–6 months
**Status:** Approved

## Overview

v2 advances YouCourse across three sequential phases: fixing the creator pipeline, deepening the learner experience, and opening the app to organic discovery. Monetization is deferred to v3.

The product philosophy constraint that drives every design decision here: **creators don't know exactly what they need — that's why they're using the AI.** v2 gives creators tools to fix AI implementation failures (wrong video, failed transcript), not to second-guess AI decisions (lesson order, curriculum topics). Editing the curriculum would reduce the product to a manual YouTube playlist builder.

---

## Phase 1: Creator Experience

**Goal:** Creators can fix AI implementation failures without re-generating the entire course.

**Success criteria:**
1. A creator can replace a bad video on any lesson without affecting other lessons
2. A creator can trigger question regeneration on a lesson where the transcript was unavailable
3. A creator can delete a lesson that is fundamentally unfixable
4. Generating a course on a topic that shares videos with an existing course makes zero additional YouTube API calls for those shared videos

### Feature 1.1 — Shared Video Cache

**Problem:** `transcriptCached` and video metadata currently live on the `lessons` table. If two courses generate lessons that land on the same YouTube video, the transcript is fetched and stored twice. With a growing catalog driving more course generation on similar topics, this waste compounds.

**Solution:** A new `video_cache` table keyed by `youtubeVideoId`.

```
video_cache
  youtubeVideoId  text  PK
  title           text
  durationSeconds integer
  transcriptText  text
  transcriptStatus text   — "available" | "unavailable" | "low_quality"
  fetchedAt       timestamp
```

The generation pipeline checks `video_cache` before making any YouTube API call. On a hit, it reads from the DB and skips the fetch. On a miss, it fetches, writes to `video_cache`, then continues.

Lessons drop `transcriptCached`, `videoTitle`, and `videoDurationSeconds` — they reference `youtubeVideoId` and the cache row owns those fields. Playback continues to use `youtubeVideoId` directly; the cache is server-only.

### Feature 1.2 — Swap a Video

**Problem:** The AI picked the right lesson topic but the wrong YouTube video (wrong language, unrelated content, low quality). There is currently no way to fix this without deleting and recreating the course.

**Solution:** A "Swap video" action on each lesson row in the course edit page. Opens an inline panel with the current video and a search field pre-filled with the lesson topic. On submit, triggers a server action that:
1. Searches YouTube for the new query
2. Checks `video_cache` for the result; fetches if not cached
3. Updates `lessons.youtubeVideoId` to the new video
4. Regenerates questions from the new transcript
5. Deletes old questions for that lesson

Loading state is scoped to the lesson row — other lessons are unaffected.

### Feature 1.3 — Retry Question Generation

**Problem:** When a transcript was unavailable at generation time, questions were generated blind (from topic + title only). These questions are often hallucinated or off-target. The creator currently cannot trigger a retry.

**Solution:** A "Regenerate questions" button visible on lessons where `video_cache.transcriptStatus != "available"`. On click, re-attempts transcript fetch (transcript may have become available since), updates the cache row, and regenerates questions from whatever context is now available. Old questions for the lesson are replaced.

### Feature 1.4 — Delete a Lesson

**Problem:** No way to remove a lesson that is broken beyond repair.

**Solution:** A "Delete lesson" action on the edit page, behind a confirmation dialog. Server action:
1. Deletes the lesson row (cascades to its questions)
2. Deletes `userProgress` rows referencing this lesson
3. Renumbers remaining `lessons.position` values to close the gap

Learners who were on the deleted lesson are redirected to the course overview on next load.

---

## Phase 2: Learner Polish

**Goal:** Finishing a course feels meaningful; learners have agency over the quiz experience; bad questions surface to creators.

**Success criteria:**
1. A learner can request additional question sets for any video after watching it, without limit
2. Each on-demand set is visually distinct from the original and from prior on-demand sets
3. A learner can flag any question in one tap; the flag count is visible to the creator
4. Completing all lessons in a course produces a shareable completion record

### Feature 2.1 — On-Demand Question Sets

**Problem:** v1 generates exactly 5 questions per video at course creation. Learners who want to test themselves more deeply have no recourse.

**Solution:** An "I want more questions" button shown after passing a quiz. Each click calls a server action that:
1. Pulls `transcriptText` from `video_cache` for the lesson's video
2. Calls Groq (`llama-3.3-70b-versatile`) with a prompt that includes the transcript and the existing questions (to avoid repeats)
3. Generates 5 new questions
4. Stores them with `questions.setIndex` incremented from the last set for that lesson

`setIndex` schema:
- `0` = original batch generated at course creation
- `1, 2, 3…` = each on-demand batch

The quiz UI presents one set at a time, labeled "Set 2", "Set 3", etc. so the learner knows they're on fresh material.

**Cost note:** Groq is cheap enough that this is unlimited for now. The `setIndex` structure is the natural hook for a pro-only gate when v3 monetization ships — cap free users at set 0, unlock sets 1+ for pro.

### Feature 2.2 — Flag a Question

**Problem:** AI-generated questions sometimes contain errors, ambiguous wording, or incorrect answer keys. Learners have no way to report this.

**Solution:** A small "Flag" button per question during the quiz. Single tap, no form. Writes a row to a new `question_flags` table:

```
question_flags
  id          text  PK
  questionId  text  → questions.id
  userId      text  → users.id
  flaggedAt   timestamp
  unique(questionId, userId)
```

Questions are not auto-removed — they remain in the quiz. Creators see a flag count badge on flagged questions in the lesson edit view, giving them signal to delete or replace specific questions.

### Feature 2.3 — Completion Record

**Problem:** Finishing a course leaves no trace — nothing on the dashboard, nothing shareable, no sense of achievement.

**Solution:** When a learner passes the final lesson's quiz, a server action writes to a new `course_completions` table:

```
course_completions
  id           text  PK
  userId       text  → users.id
  courseId     text  → courses.id
  completedAt  timestamp
  unique(userId, courseId)
```

A `/learn/[courseId]/complete` page renders a completion screen showing: course title, creator name, completion date, and lesson count. The page is publicly accessible via URL — shareable on social or as a portfolio link. No PDF certificate in v2; the page is the record.

The learner dashboard shows a "Completed" section distinct from "In Progress".

---

## Phase 3: Discovery

**Goal:** Public courses are findable without a direct link. Organic discovery becomes possible.

**Success criteria:**
1. Anonymous users can browse all public courses at `/catalog`
2. A keyword search across title and topic returns relevant results
3. Courses can be filtered by length preset
4. Public course pages are crawlable with proper metadata for SEO and social sharing

### Feature 3.1 — Public Catalog

A `/catalog` page listing all courses where `visibility = 'public'`, ordered by `createdAt` descending. No auth required to browse. Each course card shows:
- Course title
- Creator display name
- Topic
- Lesson count
- Length preset badge (Quick / Standard / Long)

Clicking a card goes to `/courses/[courseId]`. Auth is required to start learning — anonymous users see the course overview but are prompted to sign in before the first lesson loads.

Catalog page uses Next.js `unstable_cache` (or `use cache`) with a short TTL (60s) so repeated loads don't hammer the DB while still reflecting newly published courses quickly.

### Feature 3.2 — Keyword Search

A search input on the catalog page. On submit (or debounced input), filters results using a Postgres `ILIKE` query against `courses.title` and `courses.topic`. Fast enough at v2 scale without a search index. `tsvector` full-text search can be layered on in v3 if needed.

### Feature 3.3 — Length Filter

Filter chips on the catalog page: **All / Quick / Standard / Long**, mapping to `courses.lengthPreset`. Subject-area filtering is deferred — it requires either a `category` field on courses or deriving categories from topic strings, and the value is unclear without real usage data to see what topics cluster naturally.

### Feature 3.4 — SEO for Course Pages

Each public course page (`/courses/[courseId]`) exports a `generateMetadata` function that sets:
- `title`: `{course.title} — YouCourse`
- `description`: `{course.description}` (first 160 chars)
- `og:title`, `og:description` for social sharing

Private course pages return `noindex`. This is low-effort, high-leverage: it's what makes catalog courses findable via Google and shareable with a preview card on social.

---

## Schema Changes Summary

| Table | Change | Phase |
|-------|--------|-------|
| `video_cache` | New table | 1 |
| `lessons` | Drop `transcriptCached`, `videoTitle`, `videoDurationSeconds` | 1 |
| `questions` | Add `setIndex integer default 0` | 2 |
| `question_flags` | New table | 2 |
| `course_completions` | New table | 2 |

---

## Out of Scope for v2

| Feature | Reason |
|---------|--------|
| Curriculum editing (rename, reorder, add lessons) | Undermines the AI-first product promise — if users knew the right curriculum, they'd build a playlist manually |
| Subject-area filtering in catalog | Requires category taxonomy with no usage data to inform it |
| PDF completion certificates | Page-as-record is sufficient; PDF adds complexity without clear value |
| On-demand question gate (pro-only) | Deferred to v3 monetization; `setIndex` structure is ready for the gate |
| Monetization / paywall | Deferred to v3 |
| OAuth login | Deferred |
| Creator analytics | Deferred until meaningful usage data exists |

---

## Requirements Traceability

| v2 Requirement | Status | Notes |
|----------------|--------|-------|
| CGEN-v2-01 (edit curriculum) | Removed | Violates AI-first philosophy |
| CGEN-v2-02 (swap video) | Phase 1 | Feature 1.2 |
| CGEN-v2-03 (reorder/remove lessons) | Partial | Delete only (Feature 1.4); reorder deferred |
| LRNN-v2-01 (more questions) | Phase 2 | Feature 2.1, unlimited sets |
| LRNN-v2-02 (flag question) | Phase 2 | Feature 2.2 |
| LRNN-v2-03 (completion record) | Phase 2 | Feature 2.3 |
| CTLG-v2-01 (public catalog) | Phase 3 | Feature 3.1 |
| CTLG-v2-02 (keyword search) | Phase 3 | Feature 3.2 |
| CTLG-v2-03 (length filter) | Phase 3 | Feature 3.3 (subject filter deferred) |
| CTLG-v2-04 (anonymous browsing) | Phase 3 | Feature 3.1 |
| MON-v2-01/02 (monetization) | Deferred | v3 |
