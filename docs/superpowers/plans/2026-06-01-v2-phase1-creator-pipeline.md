# v2 Phase 1: Creator Pipeline Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give creators tools to fix AI implementation failures (bad video, failed transcript, broken lesson) without regenerating the entire course; simultaneously deduplicate YouTube metadata + transcript fetches via a shared `video_cache` table.

**Architecture:** Add a `video_cache` table keyed by `youtubeVideoId` that owns title, duration, and transcript. Lessons drop those three columns and instead join the cache. The generation pipeline checks the cache before fetching transcript; new creator server actions (swap video, retry questions, delete lesson) operate on the cache and lessons table. The edit page gains a lesson management section backed by three inline client action components.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Neon, Groq llama-4-scout via Vercel AI SDK, `react-youtube` (unchanged), Tailwind CSS v4, TypeScript strict.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/db/schema.ts` | Modify | Add `videoCache` table; drop `transcriptCached`, `videoTitle`, `videoDurationSeconds`, `transcriptStatus` from `lessons`; add Drizzle relations |
| `src/actions/generate-course.ts` | Modify | Check/write `video_cache` instead of storing metadata on lessons |
| `src/app/courses/[courseId]/page.tsx` | Modify | Join `videoCache` for lesson title/duration display |
| `src/app/learn/[courseId]/page.tsx` | Modify | Join `videoCache` for lesson title/duration display |
| `src/app/learn/[courseId]/[lessonId]/page.tsx` | Modify | Join `videoCache` for lesson title in heading |
| `src/app/courses/[courseId]/edit/page.tsx` | Modify | Fetch lessons + cache data; add lesson management section |
| `src/actions/swap-video.ts` | Create | Swap a lesson's video + regenerate questions |
| `src/actions/retry-questions.ts` | Create | Retry transcript fetch + regenerate questions for a lesson |
| `src/actions/delete-lesson.ts` | Create | Delete a lesson; cascade to questions + progress; renumber siblings |
| `src/components/course/lesson-actions.tsx` | Create | Client component: inline swap/retry/delete UI per lesson row |

---

## Task 1: Schema — Add `video_cache`, update `lessons`, add relations

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Replace the `lessons` table and add `videoCache` + relations in schema.ts**

Replace the entire contents of `src/lib/db/schema.ts` with:

```typescript
import { pgTable, text, timestamp, primaryKey, integer, boolean, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}))

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}))

export const courses = pgTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  creatorId: text("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  topic: text("topic").notNull(),
  lengthPreset: text("length_preset").notNull(),
  visibility: text("visibility").notNull().default("private"),
  status: text("status").notNull().default("generating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const videoCache = pgTable("video_cache", {
  youtubeVideoId: text("youtube_video_id").primaryKey(),
  title: text("title").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  transcriptText: text("transcript_text"),
  transcriptStatus: text("transcript_status").notNull().default("unavailable"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
})

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  topic: text("topic").notNull(),
  youtubeVideoId: text("youtube_video_id").references(() => videoCache.youtubeVideoId, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const lessonsRelations = relations(lessons, ({ one }) => ({
  videoCache: one(videoCache, {
    fields: [lessons.youtubeVideoId],
    references: [videoCache.youtubeVideoId],
  }),
}))

export const questions = pgTable("questions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  questionText: text("question_text").notNull(),
  options: text("options").notNull(),
  correctIndex: integer("correct_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const userProgress = pgTable("user_progress", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  passedQuiz: boolean("passed_quiz").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.userId, t.lessonId),
}))
```

**Note:** `passwordResetTokens` was in the original schema — include it. The `transcriptStatus` field is removed from `lessons` entirely; its state now lives in `video_cache.transcriptStatus`.

- [ ] **Step 2: Push schema changes to the database**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run db:push
```

Expected: Drizzle asks to confirm dropping columns (`transcript_cached`, `video_title`, `video_duration_seconds`, `transcript_status`) from `lessons` and creating `video_cache`. Type `yes` to confirm. If there are existing lessons in the DB with those column values, Drizzle will warn about data loss — that's expected; v1 data is sacrificed for the migration.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: errors about `lesson.videoTitle`, `lesson.transcriptCached`, `lesson.videoDurationSeconds`, `lesson.transcriptStatus` — these are the callers we fix in subsequent tasks. Count and note them; they'll all be resolved.

- [ ] **Step 4: Commit schema**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(schema): add video_cache table, strip cached fields from lessons"
```

---

## Task 2: Update generation pipeline to use `video_cache`

**Files:**
- Modify: `src/actions/generate-course.ts`

The updated pipeline:
1. Searches YouTube for a video ID (unchanged)
2. Checks `video_cache` for that video ID
3. **Cache hit:** reads title/duration/transcript from cache — no further fetching
4. **Cache miss:** fetches transcript, writes a `video_cache` row, continues
5. Stores only `youtubeVideoId` on the lesson row (no more title/duration/transcriptStatus)

- [ ] **Step 1: Rewrite generate-course.ts**

```typescript
"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions, videoCache } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { generateCurriculum } from "@/lib/ai/curriculum"
import { searchYouTubeVideo } from "@/lib/youtube/search"
import { generateQuestions } from "@/lib/ai/questions"
import { fetchTranscript } from "@/lib/youtube/transcript"
import { eq } from "drizzle-orm"

export async function generateCourse(
  formData: FormData
): Promise<{ courseId: string } | { error: string }> {
  let courseId: string | undefined

  try {
    const session = await verifySession()

    const topic = (formData.get("topic") as string)?.trim()
    const lengthPresetRaw = formData.get("lengthPreset") as string
    const validPresets = ["quick", "standard", "long"] as const
    if (!validPresets.includes(lengthPresetRaw as typeof validPresets[number])) {
      return { error: "Invalid length preset" }
    }
    const lengthPreset = lengthPresetRaw as "quick" | "standard" | "long"

    if (!topic) return { error: "Topic is required" }
    if (topic.length > 200) return { error: "Topic must be 200 characters or less" }

    const [newCourse] = await db
      .insert(courses)
      .values({
        creatorId: session.userId,
        title: topic,
        topic,
        lengthPreset,
        status: "generating",
        visibility: "private",
      })
      .returning({ id: courses.id })

    courseId = newCourse.id

    const lessonTopics = await generateCurriculum(topic, lengthPreset)

    const lessonRows: { id: string; topic: string }[] = []
    for (let i = 0; i < lessonTopics.length; i++) {
      const [row] = await db
        .insert(lessons)
        .values({ courseId, position: i, topic: lessonTopics[i] })
        .returning({ id: lessons.id })
      lessonRows.push({ id: row.id, topic: lessonTopics[i] })
    }

    await Promise.all(
      lessonRows.map(async ({ id: lessonId, topic: lessonTopic }) => {
        try {
          const video = await searchYouTubeVideo(lessonTopic)
          if (!video) return

          // Check cache before fetching transcript
          const cached = await db.query.videoCache.findFirst({
            where: eq(videoCache.youtubeVideoId, video.videoId),
          })

          if (!cached) {
            const transcriptText = await fetchTranscript(video.videoId)
            await db.insert(videoCache).values({
              youtubeVideoId: video.videoId,
              title: video.title,
              durationSeconds: video.durationSeconds,
              transcriptText,
              transcriptStatus: transcriptText ? "available" : "unavailable",
            }).onConflictDoNothing()
          }

          const cacheRow = cached ?? await db.query.videoCache.findFirst({
            where: eq(videoCache.youtubeVideoId, video.videoId),
          })

          if (!cacheRow) return

          const qs = await generateQuestions(
            cacheRow.transcriptText,
            lessonTopic,
            cacheRow.title,
            cacheRow.durationSeconds
          )

          await db.update(lessons)
            .set({ youtubeVideoId: video.videoId })
            .where(eq(lessons.id, lessonId))

          await db.insert(questions).values(
            qs.map((q, i) => ({
              lessonId,
              position: i,
              questionText: q.question_text,
              options: JSON.stringify(q.options),
              correctIndex: q.correct_index,
            }))
          )
        } catch {
          // Leave lesson with no video — creator can fix via swap
        }
      })
    )

    await db.update(courses).set({
      status: "ready",
      title: `${topic} — Generated Course`,
    }).where(eq(courses.id, courseId))

    return { courseId }
  } catch (err) {
    if (courseId) {
      await db.update(courses).set({ status: "error" }).where(eq(courses.id, courseId))
    }
    return { error: err instanceof Error ? err.message : "Generation failed" }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles (errors should decrease)**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "generate-course"
```

Expected: no errors in `generate-course.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/actions/generate-course.ts
git commit -m "feat(pipeline): use video_cache for transcript deduplication"
```

---

## Task 3: Update pages that display lesson title and duration

Three pages read `lesson.videoTitle` and `lesson.videoDurationSeconds` directly. After Task 1, those columns are gone — data comes from `lesson.videoCache` via the Drizzle relation.

**Files:**
- Modify: `src/app/courses/[courseId]/page.tsx`
- Modify: `src/app/learn/[courseId]/page.tsx`
- Modify: `src/app/learn/[courseId]/[lessonId]/page.tsx`

- [ ] **Step 1: Update courses/[courseId]/page.tsx**

The lesson query needs `with: { videoCache: true }`. Find this block:

```typescript
  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
  })
```

Replace it with:

```typescript
  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
    with: { videoCache: true },
  })
```

Then find the lesson card rendering block and replace references to `lesson.videoTitle` and `lesson.videoDurationSeconds`:

```typescript
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[--text-primary] leading-snug">
                  {lesson.videoCache?.title ?? lesson.topic}
                </p>
                {lesson.videoCache?.durationSeconds && (
                  <p className="text-[13px] text-[--text-secondary] mt-0.5">{formatDuration(lesson.videoCache.durationSeconds)}</p>
                )}
              </div>
```

- [ ] **Step 2: Update learn/[courseId]/page.tsx**

Same pattern. Find:

```typescript
  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
  })
```

Replace with:

```typescript
  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
    with: { videoCache: true },
  })
```

Then replace every reference to `lesson.videoTitle` → `lesson.videoCache?.title` and `lesson.videoDurationSeconds` → `lesson.videoCache?.durationSeconds`. There are two occurrences of each in this file (in the lesson card rendering). Updated card section:

```typescript
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-medium leading-snug ${state === "locked" ? "text-[--text-secondary]" : "text-[--text-primary]"}`}>
                  {lesson.videoCache?.title ?? lesson.topic}
                </p>
                {lesson.videoCache?.durationSeconds && (
                  <p className="text-[13px] text-[--text-secondary] mt-0.5">{formatDuration(lesson.videoCache.durationSeconds)}</p>
                )}
              </div>
```

- [ ] **Step 3: Update learn/[courseId]/[lessonId]/page.tsx**

This page reads one lesson. Add the `with` clause to the single-lesson fetch:

```typescript
  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { videoCache: true },
  })
```

Then update the heading:

```typescript
          <h1 className="text-[22px] font-semibold text-[--text-primary] leading-snug mt-0.5">
            {lesson.videoCache?.title ?? lesson.topic}
          </h1>
```

- [ ] **Step 4: Verify no TypeScript errors remain from column removal**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Manual smoke test**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run dev
```

Open `http://localhost:3000/courses/<any-existing-courseId>`. Verify lesson titles and durations still display (or show the lesson topic as fallback for older rows with no cache data).

- [ ] **Step 6: Commit**

```bash
git add src/app/courses/[courseId]/page.tsx src/app/learn/[courseId]/page.tsx "src/app/learn/[courseId]/[lessonId]/page.tsx"
git commit -m "feat(ui): read lesson title/duration from video_cache join"
```

---

## Task 4: `swapVideo` server action

Replaces the video on a lesson: searches YouTube, checks/populates cache, replaces lesson's `youtubeVideoId`, deletes old questions, generates new questions from cache transcript.

**Files:**
- Create: `src/actions/swap-video.ts`

- [ ] **Step 1: Create swap-video.ts**

```typescript
"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions, videoCache } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { searchYouTubeVideo } from "@/lib/youtube/search"
import { fetchTranscript } from "@/lib/youtube/transcript"
import { generateQuestions } from "@/lib/ai/questions"
import { eq } from "drizzle-orm"

export async function swapVideo(
  lessonId: string,
  searchQuery: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession()

  if (!searchQuery.trim()) return { error: "Search query is required" }

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { error: "Lesson not found" }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course || course.creatorId !== session.userId) return { error: "Not authorised" }

  const video = await searchYouTubeVideo(searchQuery.trim())
  if (!video) return { error: "No YouTube video found for that query" }

  const cached = await db.query.videoCache.findFirst({
    where: eq(videoCache.youtubeVideoId, video.videoId),
  })

  if (!cached) {
    const transcriptText = await fetchTranscript(video.videoId)
    await db.insert(videoCache).values({
      youtubeVideoId: video.videoId,
      title: video.title,
      durationSeconds: video.durationSeconds,
      transcriptText,
      transcriptStatus: transcriptText ? "available" : "unavailable",
    }).onConflictDoNothing()
  }

  const cacheRow = cached ?? await db.query.videoCache.findFirst({
    where: eq(videoCache.youtubeVideoId, video.videoId),
  })

  if (!cacheRow) return { error: "Failed to cache video" }

  const newQuestions = await generateQuestions(
    cacheRow.transcriptText,
    lesson.topic,
    cacheRow.title,
    cacheRow.durationSeconds
  )

  await db.delete(questions).where(eq(questions.lessonId, lessonId))

  await db.update(lessons)
    .set({ youtubeVideoId: video.videoId })
    .where(eq(lessons.id, lessonId))

  await db.insert(questions).values(
    newQuestions.map((q, i) => ({
      lessonId,
      position: i,
      questionText: q.question_text,
      options: JSON.stringify(q.options),
      correctIndex: q.correct_index,
    }))
  )

  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "swap-video"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/swap-video.ts
git commit -m "feat(actions): add swapVideo server action"
```

---

## Task 5: `retryQuestions` server action

Re-attempts transcript fetch on a video that previously had `transcriptStatus: "unavailable"`, updates the cache, and regenerates questions.

**Files:**
- Create: `src/actions/retry-questions.ts`

- [ ] **Step 1: Create retry-questions.ts**

```typescript
"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions, videoCache } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { fetchTranscript } from "@/lib/youtube/transcript"
import { generateQuestions } from "@/lib/ai/questions"
import { eq } from "drizzle-orm"

export async function retryQuestions(
  lessonId: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession()

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { videoCache: true },
  })
  if (!lesson) return { error: "Lesson not found" }
  if (!lesson.youtubeVideoId) return { error: "Lesson has no video — use Swap Video instead" }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course || course.creatorId !== session.userId) return { error: "Not authorised" }

  const transcriptText = await fetchTranscript(lesson.youtubeVideoId)

  await db.update(videoCache)
    .set({
      transcriptText,
      transcriptStatus: transcriptText ? "available" : "unavailable",
      fetchedAt: new Date(),
    })
    .where(eq(videoCache.youtubeVideoId, lesson.youtubeVideoId))

  const cacheRow = lesson.videoCache!
  const newQuestions = await generateQuestions(
    transcriptText,
    lesson.topic,
    cacheRow.title,
    cacheRow.durationSeconds
  )

  await db.delete(questions).where(eq(questions.lessonId, lessonId))

  await db.insert(questions).values(
    newQuestions.map((q, i) => ({
      lessonId,
      position: i,
      questionText: q.question_text,
      options: JSON.stringify(q.options),
      correctIndex: q.correct_index,
    }))
  )

  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "retry-questions"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/retry-questions.ts
git commit -m "feat(actions): add retryQuestions server action"
```

---

## Task 6: `deleteLesson` server action

Deletes a lesson and cascades. Renumbers remaining lessons to close the gap so positions remain 0-indexed and contiguous.

**Files:**
- Create: `src/actions/delete-lesson.ts`

- [ ] **Step 1: Create delete-lesson.ts**

```typescript
"use server"

import { db } from "@/lib/db"
import { courses, lessons, userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { eq, and, gt } from "drizzle-orm"

export async function deleteLesson(
  lessonId: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession()

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { error: "Lesson not found" }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course || course.creatorId !== session.userId) return { error: "Not authorised" }

  const deletedPosition = lesson.position
  const courseId = lesson.courseId

  // Delete progress rows for this lesson (cascade from lessons table handles questions)
  await db.delete(userProgress).where(eq(userProgress.lessonId, lessonId))

  // Delete the lesson (cascades to its questions)
  await db.delete(lessons).where(eq(lessons.id, lessonId))

  // Renumber remaining lessons after the deleted one
  const remaining = await db.query.lessons.findMany({
    where: and(eq(lessons.courseId, courseId), gt(lessons.position, deletedPosition)),
    orderBy: (l, { asc }) => [asc(l.position)],
  })

  for (const l of remaining) {
    await db.update(lessons)
      .set({ position: l.position - 1 })
      .where(eq(lessons.id, l.id))
  }

  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "delete-lesson"
```

Expected: no errors.

- [ ] **Step 3: Confirm `gt` is imported from drizzle-orm in the file above**

The import line already includes `gt`. Double check the file was written correctly.

- [ ] **Step 4: Commit**

```bash
git add src/actions/delete-lesson.ts
git commit -m "feat(actions): add deleteLesson server action with position renumbering"
```

---

## Task 7: Lesson management UI on edit page

The edit page currently only shows the course metadata form (title, description, visibility). This task adds a **Lessons** section below it with per-lesson rows, each having:
- Lesson number + topic
- Video title from cache (or "No video" badge)
- **Swap Video** button (shows inline form)
- **Retry Questions** button (only if `transcriptStatus !== "available"`)
- **Delete** button (behind confirmation)

Two files change: `edit/page.tsx` (Server Component, fetch + render) and new `LessonActions` client component.

**Files:**
- Modify: `src/app/courses/[courseId]/edit/page.tsx`
- Create: `src/components/course/lesson-actions.tsx`

- [ ] **Step 1: Create `src/components/course/lesson-actions.tsx`**

This is a client component that handles the three actions inline. It receives lesson data as props and manages its own loading/error/UI state.

```typescript
"use client"

import { useState } from "react"
import { swapVideo } from "@/actions/swap-video"
import { retryQuestions } from "@/actions/retry-questions"
import { deleteLesson } from "@/actions/delete-lesson"
import { useRouter } from "next/navigation"

type Props = {
  lessonId: string
  lessonTopic: string
  hasVideo: boolean
  transcriptAvailable: boolean
}

export function LessonActions({ lessonId, lessonTopic, hasVideo, transcriptAvailable }: Props) {
  const router = useRouter()
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapQuery, setSwapQuery] = useState(lessonTopic)
  const [loading, setLoading] = useState<"swap" | "retry" | "delete" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault()
    setLoading("swap")
    setError(null)
    const result = await swapVideo(lessonId, swapQuery)
    setLoading(null)
    if ("error" in result) { setError(result.error); return }
    setSwapOpen(false)
    router.refresh()
  }

  async function handleRetry() {
    setLoading("retry")
    setError(null)
    const result = await retryQuestions(lessonId)
    setLoading(null)
    if ("error" in result) { setError(result.error); return }
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm("Delete this lesson? This cannot be undone.")) return
    setLoading("delete")
    setError(null)
    const result = await deleteLesson(lessonId)
    setLoading(null)
    if ("error" in result) { setError(result.error); return }
    router.refresh()
  }

  return (
    <div className="mt-2">
      {error && <p className="text-[13px] text-red-500 mb-2">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => setSwapOpen((o) => !o)}
          className="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-md border border-[--border] text-[13px] font-medium text-[--text-primary] hover:bg-[--bg-surface] disabled:opacity-50 transition-colors"
        >
          {loading === "swap" ? "Swapping…" : "Swap Video"}
        </button>

        {hasVideo && !transcriptAvailable && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={handleRetry}
            className="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-md border border-[--border] text-[13px] font-medium text-[--text-primary] hover:bg-[--bg-surface] disabled:opacity-50 transition-colors"
          >
            {loading === "retry" ? "Retrying…" : "Retry Questions"}
          </button>
        )}

        <button
          type="button"
          disabled={loading !== null}
          onClick={handleDelete}
          className="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-md border border-red-200 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>

      {swapOpen && (
        <form onSubmit={handleSwap} className="mt-3 flex gap-2">
          <input
            type="text"
            value={swapQuery}
            onChange={(e) => setSwapQuery(e.target.value)}
            disabled={loading === "swap"}
            placeholder="Search query for replacement video"
            className="flex-1 min-h-[36px] px-3 py-2 rounded-md border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading === "swap" || !swapQuery.trim()}
            className="inline-flex items-center min-h-[36px] px-4 py-2 rounded-md bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[14px] font-semibold disabled:opacity-50"
          >
            {loading === "swap" ? "…" : "Swap"}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `src/app/courses/[courseId]/edit/page.tsx`**

Replace the entire file:

```typescript
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { courses, lessons } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { verifySession } from "@/lib/dal"
import { EditCourseForm } from "@/components/course/edit-course-form"
import { LessonActions } from "@/components/course/lesson-actions"

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const session = await verifySession()

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) notFound()
  if (course.creatorId !== session.userId) redirect("/dashboard")

  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
    with: { videoCache: true },
  })

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[640px]">
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-8">Edit Course</h1>

        <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm mb-8">
          <EditCourseForm
            courseId={courseId}
            defaultTitle={course.title}
            defaultDescription={course.description ?? null}
            defaultVisibility={course.visibility}
          />
        </div>

        <h2 className="text-[20px] font-semibold text-[--text-primary] mb-4">Lessons</h2>
        <div className="flex flex-col gap-3">
          {courseLessons.map((lesson, i) => (
            <div key={lesson.id} className="rounded-xl border border-[--border] bg-[--bg-surface] p-4">
              <div className="flex items-start gap-3">
                <span className="text-[13px] font-mono text-[--text-secondary] mt-0.5 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[--text-primary] leading-snug">
                    {lesson.videoCache?.title ?? lesson.topic}
                  </p>
                  {!lesson.youtubeVideoId && (
                    <span className="inline-block mt-1 text-[12px] px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 bg-amber-50">
                      No video
                    </span>
                  )}
                  {lesson.videoCache && lesson.videoCache.transcriptStatus !== "available" && (
                    <span className="inline-block mt-1 ml-1 text-[12px] px-2 py-0.5 rounded-full border border-[--border] text-[--text-secondary]">
                      No transcript
                    </span>
                  )}
                  <LessonActions
                    lessonId={lesson.id}
                    lessonTopic={lesson.topic}
                    hasVideo={!!lesson.youtubeVideoId}
                    transcriptAvailable={lesson.videoCache?.transcriptStatus === "available"}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Manual end-to-end test**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run dev
```

1. Navigate to `http://localhost:3000/generate` → create a test course
2. After it generates, go to `http://localhost:3000/courses/<courseId>/edit`
3. Verify the Lessons section renders below the metadata form
4. For a lesson with a video: verify "Swap Video" and "Delete" appear; "Retry Questions" appears only if transcript was unavailable
5. Click "Swap Video" → verify inline input opens pre-filled with lesson topic
6. Enter a different search query → click Swap → verify it replaces the video and refreshes
7. Click "Delete" on a lesson → confirm dialog → verify lesson disappears and remaining lessons renumber
8. Navigate to `http://localhost:3000/learn/<courseId>` → verify lesson titles still render correctly

- [ ] **Step 5: Commit**

```bash
git add src/components/course/lesson-actions.tsx "src/app/courses/[courseId]/edit/page.tsx"
git commit -m "feat(ui): add lesson management section to edit page (swap, retry, delete)"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| `video_cache` table keyed by `youtubeVideoId` | Task 1 |
| Generation pipeline checks cache before fetching | Task 2 |
| `lessons` drops `transcriptCached`, `videoTitle`, `videoDurationSeconds` | Task 1 |
| `transcriptStatus` moves to `video_cache` | Task 1 |
| Pages still show lesson title/duration | Task 3 |
| Creator can swap a bad video | Task 4 + Task 7 |
| Creator can retry question generation on unavailable transcript | Task 5 + Task 7 |
| Creator can delete a lesson (cascades, renumbers) | Task 6 + Task 7 |
| Retry button only shows when transcript unavailable | Task 7 (`transcriptAvailable` prop) |

All spec features covered.

### Type consistency check

- `videoCache` is the export name in `schema.ts`; all action files import it as `videoCache` ✓
- `swapVideo(lessonId, searchQuery)` called from `LessonActions` with same signature ✓
- `retryQuestions(lessonId)` called from `LessonActions` with same signature ✓
- `deleteLesson(lessonId)` called from `LessonActions` with same signature ✓
- `with: { videoCache: true }` requires `lessonsRelations` export — included in schema Task 1 ✓

### Migration risk

`npm run db:push` will drop columns from the live `lessons` table. Any existing lesson rows will lose `videoTitle`, `videoDurationSeconds`, `transcriptCached`, `transcriptStatus` data. Since this is pre-launch with no real users, this is acceptable. After the push, existing lessons with `youtubeVideoId` set will have no `video_cache` row — their video will still play (player uses `youtubeVideoId` directly) but title/duration will fall back to `lesson.topic` until the creator swaps the video (which populates the cache).
