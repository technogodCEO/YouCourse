# v2 Phase 2: Learner Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the learner experience: unlimited on-demand question sets per lesson, per-question flagging for creator feedback, and a shareable course completion record.

**Architecture:** Three schema additions (`questions.setIndex`, `question_flags`, `course_completions`) unlock three feature pillars. `submitQuiz` is extended to grade a specific set and detect course completion. A new `generate-question-set` action creates additional question batches from the cached transcript. The lesson page gains a set selector dropdown and flag buttons; the dashboard gains learner sections; a new `/complete` page closes the learning loop.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Neon, Groq llama-4-scout via Vercel AI SDK, Tailwind CSS v4, TypeScript strict.

**Branch strategy:** Execute on branch `v2/phase2` cut from `main` after Phase 1 is merged. Open a PR to `main` when all tasks are complete.

---

## Design decisions recorded here

- **No-transcript guard:** If `video_cache.transcriptStatus !== "available"` when a learner requests more questions, the action returns `{ error: "noTranscript" }` and the UI shows a visible warning — no generation attempt.
- **Set replacement:** The quiz area always shows one set at a time (the most recent by default). A dropdown lets the learner switch to any prior set.
- **Flag timing:** Flag button is visible per-question at all times once the quiz is shown (before and after submission, including review mode).
- **Completion page privacy:** Publicly accessible by URL. Course privacy is not inherited — the unique ID provides sufficient obscurity for v2.
- **Dashboard unified:** `/dashboard` is the same page for creators and learners. Phase 2 adds "Learning" sections below the existing "My Courses" section.
- **submitQuiz setIndex:** `submitQuiz` now accepts a `setIndex` argument. It grades only questions in that set. Returns `courseCompleted: true` when passing the final lesson.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/db/schema.ts` | Modify | Add `setIndex` to `questions`; add `questionFlags` + `courseCompletions` tables + relations |
| `src/actions/submit-quiz.ts` | Modify | Accept `setIndex`; filter questions by set; detect + write course completion |
| `src/actions/generate-question-set.ts` | Create | Generate a new question batch for a lesson from cached transcript |
| `src/actions/flag-question.ts` | Create | Toggle a question flag for the current user |
| `src/app/learn/[courseId]/[lessonId]/page.tsx` | Modify | Load questions grouped by setIndex + user's flags; pass to LessonPlayer |
| `src/components/learn/lesson-player.tsx` | Modify | Track active set; show set selector + "More Questions" button after passing |
| `src/components/learn/quiz.tsx` | Modify | Accept setIndex + flag state; show flag buttons per question; call flagQuestion |
| `src/app/learn/[courseId]/complete/page.tsx` | Create | Shareable completion record page |
| `src/app/dashboard/page.tsx` | Modify | Add "In Progress" + "Completed" learner sections |
| `src/app/courses/[courseId]/edit/page.tsx` | Modify | Show per-question flag counts alongside lesson actions |

---

## Task 1: Schema — `setIndex`, `questionFlags`, `courseCompletions`

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add `setIndex` to `questions`, add `questionFlags` table, add `courseCompletions` table, add relations**

Apply these changes to `schema.ts` (add to the existing file — do not replace other tables):

```typescript
// Replace the questions table definition:
export const questions = pgTable("questions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  setIndex: integer("set_index").notNull().default(0),
  questionText: text("question_text").notNull(),
  options: text("options").notNull(),
  correctIndex: integer("correct_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Add after the questions table:
export const questionFlags = pgTable("question_flags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  flaggedAt: timestamp("flagged_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.questionId, t.userId),
}))

export const courseCompletions = pgTable("course_completions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.userId, t.courseId),
}))
```

- [ ] **Step 2: Push schema to database**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run db:push
```

Expected: Drizzle adds `set_index` column to `questions`, creates `question_flags` and `course_completions` tables. Existing question rows get `set_index = 0` via the column default. Confirm when prompted.

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors (new tables/columns don't break anything yet).

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(schema): add setIndex to questions, question_flags and course_completions tables"
```

---

## Task 2: Update `submitQuiz` — set-aware grading + course completion

`submitQuiz` currently grades all questions for a lesson. After this task it:
- Accepts a `setIndex` argument and grades only questions in that set
- Detects when a user has passed all lessons and writes to `courseCompletions`
- Returns `courseCompleted: true` when applicable

**Files:**
- Modify: `src/actions/submit-quiz.ts`

- [ ] **Step 1: Rewrite submit-quiz.ts**

```typescript
"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions, userProgress, courseCompletions } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, asc, eq } from "drizzle-orm"

export async function submitQuiz(
  lessonId: string,
  answers: number[],
  setIndex: number = 0
): Promise<{ passed: boolean; score: number; wrongIndexes?: number[]; courseCompleted?: boolean }> {
  let session: { userId: string }
  try {
    session = await verifySession()
  } catch {
    return { passed: false, score: 0 }
  }

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { passed: false, score: 0 }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course) return { passed: false, score: 0 }
  if (course.visibility !== "public" && course.creatorId !== session.userId) {
    return { passed: false, score: 0 }
  }

  const qs = await db.query.questions.findMany({
    where: and(eq(questions.lessonId, lessonId), eq(questions.setIndex, setIndex)),
    orderBy: [asc(questions.position)],
  })

  if (!qs.length) return { passed: false, score: 0 }

  const wrongIndexes = qs
    .map((q, i) => (answers[i] !== q.correctIndex ? i : -1))
    .filter((i) => i !== -1)
  const correct = qs.length - wrongIndexes.length
  const score = Math.round((correct / qs.length) * 100)
  const passed = score >= 70

  if (!passed) return { passed, score, wrongIndexes }

  await db
    .update(userProgress)
    .set({ passedQuiz: true, completedAt: new Date() })
    .where(and(eq(userProgress.userId, session.userId), eq(userProgress.lessonId, lessonId)))

  // Check if all lessons in the course are now passed
  const allLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, lesson.courseId),
  })
  const allProgress = await db.query.userProgress.findMany({
    where: and(
      eq(userProgress.userId, session.userId),
      eq(userProgress.courseId, lesson.courseId)
    ),
  })
  const passedLessonIds = new Set(
    allProgress.filter((p) => p.passedQuiz).map((p) => p.lessonId)
  )
  // Include the lesson we just passed (DB write above may not be immediately reflected in the read)
  passedLessonIds.add(lessonId)

  const allPassed = allLessons.every((l) => !l.youtubeVideoId || passedLessonIds.has(l.id))

  if (allPassed) {
    await db.insert(courseCompletions).values({
      userId: session.userId,
      courseId: lesson.courseId,
    }).onConflictDoNothing()
    return { passed, score, courseCompleted: true }
  }

  return { passed, score }
}
```

**Note on "all passed" logic:** Lessons with no video are auto-skipped (via `SkipLessonButton`) and have `passedQuiz: true` in `userProgress`. The check `!l.youtubeVideoId || passedLessonIds.has(l.id)` treats no-video lessons as satisfied by their presence in `passedLessonIds` (they were skipped). This mirrors the existing skip flow.

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "submit-quiz"
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/submit-quiz.ts
git commit -m "feat(actions): submitQuiz grades by setIndex and detects course completion"
```

---

## Task 3: `generateQuestionSet` server action

Creates a new batch of 5 questions from the cached transcript, avoiding repeats from existing sets.

**Files:**
- Create: `src/actions/generate-question-set.ts`

- [ ] **Step 1: Create generate-question-set.ts**

```typescript
"use server"

import { db } from "@/lib/db"
import { lessons, questions, userProgress, videoCache } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { generateQuestions } from "@/lib/ai/questions"
import { eq, and, max } from "drizzle-orm"

export async function generateQuestionSet(
  lessonId: string
): Promise<{ setIndex: number } | { error: string }> {
  const session = await verifySession()

  const progress = await db.query.userProgress.findFirst({
    where: and(
      eq(userProgress.userId, session.userId),
      eq(userProgress.lessonId, lessonId)
    ),
  })
  if (!progress?.passedQuiz) return { error: "Complete this lesson first" }

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { videoCache: true },
  })
  if (!lesson || !lesson.videoCache) return { error: "Lesson not found" }

  if (lesson.videoCache.transcriptStatus !== "available") {
    return { error: "noTranscript" }
  }

  const existingQuestions = await db.query.questions.findMany({
    where: eq(questions.lessonId, lessonId),
  })

  const [{ maxSet }] = await db
    .select({ maxSet: max(questions.setIndex) })
    .from(questions)
    .where(eq(questions.lessonId, lessonId))

  const nextSetIndex = (maxSet ?? 0) + 1

  const existingTexts = existingQuestions.map((q) => q.questionText)
  const avoidClause = existingTexts.length
    ? `\n\nDo NOT repeat any of these questions:\n${existingTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : ""

  const newQuestions = await generateQuestions(
    lesson.videoCache.transcriptText + avoidClause,
    lesson.topic,
    lesson.videoCache.title,
    lesson.videoCache.durationSeconds
  )

  await db.insert(questions).values(
    newQuestions.map((q, i) => ({
      lessonId,
      position: i,
      setIndex: nextSetIndex,
      questionText: q.question_text,
      options: JSON.stringify(q.options),
      correctIndex: q.correct_index,
    }))
  )

  return { setIndex: nextSetIndex }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "generate-question-set"
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/generate-question-set.ts
git commit -m "feat(actions): add generateQuestionSet for on-demand question batches"
```

---

## Task 4: `flagQuestion` server action

Toggles a flag on a question for the current user. One flag per user per question.

**Files:**
- Create: `src/actions/flag-question.ts`

- [ ] **Step 1: Create flag-question.ts**

```typescript
"use server"

import { db } from "@/lib/db"
import { questionFlags } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, eq } from "drizzle-orm"

export async function flagQuestion(
  questionId: string
): Promise<{ flagged: boolean } | { error: string }> {
  const session = await verifySession()

  const existing = await db.query.questionFlags.findFirst({
    where: and(
      eq(questionFlags.questionId, questionId),
      eq(questionFlags.userId, session.userId)
    ),
  })

  if (existing) {
    await db.delete(questionFlags).where(eq(questionFlags.id, existing.id))
    return { flagged: false }
  }

  await db.insert(questionFlags).values({
    questionId,
    userId: session.userId,
  })
  return { flagged: true }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "flag-question"
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/flag-question.ts
git commit -m "feat(actions): add flagQuestion toggle action"
```

---

## Task 5: Update lesson page, LessonPlayer, and Quiz

This task wires up the three new UX features: set selector, "More Questions" button, and flag buttons. It spans the server component (data loading) and two client components (rendering + interaction).

**Files:**
- Modify: `src/app/learn/[courseId]/[lessonId]/page.tsx`
- Modify: `src/components/learn/lesson-player.tsx`
- Modify: `src/components/learn/quiz.tsx`

### Step 1: Update lesson page to load questions by set and user flags

- [ ] Replace the question-loading block in `src/app/learn/[courseId]/[lessonId]/page.tsx`:

Find:
```typescript
  const lessonQuestions = await db.query.questions.findMany({
    where: eq(questions.lessonId, lessonId),
    orderBy: [asc(questions.position)],
  })
```

Replace with:
```typescript
  const allQuestions = await db.query.questions.findMany({
    where: eq(questions.lessonId, lessonId),
    orderBy: [asc(questions.position)],
  })

  // Group by setIndex
  const setMap = new Map<number, typeof allQuestions>()
  for (const q of allQuestions) {
    if (!setMap.has(q.setIndex)) setMap.set(q.setIndex, [])
    setMap.get(q.setIndex)!.push(q)
  }
  const questionSets = Array.from(setMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([setIndex, qs]) => ({
      setIndex,
      questions: qs.flatMap((q) => {
        try {
          const opts = JSON.parse(q.options)
          if (!Array.isArray(opts) || opts.length !== 4 || !opts.every((o) => typeof o === "string")) return []
          return [{ id: q.id, questionText: q.questionText, options: opts as string[] }]
        } catch { return [] }
      }),
    }))

  // Load this user's flags for questions in this lesson
  const questionIds = allQuestions.map((q) => q.id)
  const userFlags = questionIds.length
    ? await db.query.questionFlags.findMany({
        where: (f, { and, eq, inArray }) => and(
          eq(f.userId, session.userId),
          inArray(f.questionId, questionIds)
        ),
      })
    : []
  const flaggedQuestionIds = new Set(userFlags.map((f) => f.questionId))
```

- [ ] Update the imports at the top of the lesson page to include `questions` (already imported) and `questionFlags`:

```typescript
import { courses, lessons, questions, userProgress, questionFlags } from "@/lib/db/schema"
```

- [ ] Replace the `serializedQuestions` block and the `LessonPlayer` render call:

Remove:
```typescript
  const serializedQuestions = lessonQuestions.flatMap((q) => {
    try {
      const opts = JSON.parse(q.options)
      if (!Array.isArray(opts) || opts.length !== 4 || !opts.every((o) => typeof o === "string")) return []
      return [{ id: q.id, questionText: q.questionText, options: opts as string[] }]
    } catch {
      return []
    }
  })
```

Replace the `LessonPlayer` JSX:
```tsx
        <LessonPlayer
          courseId={courseId}
          lessonId={lessonId}
          videoId={lesson.youtubeVideoId}
          questionSets={questionSets}
          flaggedQuestionIds={Array.from(flaggedQuestionIds)}
          alreadyPassed={alreadyPassed}
          hasTranscript={lesson.videoCache?.transcriptStatus === "available"}
        />
```

### Step 2: Rewrite `src/components/learn/lesson-player.tsx`

- [ ] Replace the entire file:

```typescript
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { VideoPlayer } from "@/components/learn/video-player"
import { Quiz } from "@/components/learn/quiz"
import { generateQuestionSet } from "@/actions/generate-question-set"

type QuestionData = { id: string; questionText: string; options: string[] }
type QuestionSet = { setIndex: number; questions: QuestionData[] }

type Props = {
  courseId: string
  lessonId: string
  videoId: string
  questionSets: QuestionSet[]
  flaggedQuestionIds: string[]
  alreadyPassed: boolean
  hasTranscript: boolean
}

export function LessonPlayer({
  courseId,
  lessonId,
  videoId,
  questionSets,
  flaggedQuestionIds,
  alreadyPassed,
  hasTranscript,
}: Props) {
  const router = useRouter()
  const [showQuiz, setShowQuiz] = useState(alreadyPassed)
  const [passed, setPassed] = useState(alreadyPassed)
  const [courseCompleted, setCourseCompleted] = useState(false)
  const [sets, setSets] = useState<QuestionSet[]>(questionSets)
  const [activeSetIndex, setActiveSetIndex] = useState(
    questionSets.length > 0 ? questionSets[questionSets.length - 1].setIndex : 0
  )
  const [moreQuestionsError, setMoreQuestionsError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeSet = sets.find((s) => s.setIndex === activeSetIndex) ?? sets[sets.length - 1]

  function handlePassed(completed: boolean) {
    setPassed(true)
    setCourseCompleted(completed)
  }

  function handleMoreQuestions() {
    setMoreQuestionsError(null)
    startTransition(async () => {
      const result = await generateQuestionSet(lessonId)
      if ("error" in result) {
        if (result.error === "noTranscript") {
          setMoreQuestionsError("More questions require a video transcript, which isn't available for this lesson.")
        } else {
          setMoreQuestionsError(result.error)
        }
        return
      }
      router.refresh()
      // After refresh, the page re-renders with the new set; reset active set to latest
      setActiveSetIndex(result.setIndex)
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <VideoPlayer videoId={videoId} onVideoComplete={() => setShowQuiz(true)} />

      {!showQuiz && (
        <p className="text-[14px] text-[--text-secondary] text-center">
          Complete the video to unlock the quiz.
        </p>
      )}

      {showQuiz && sets.length > 0 && (
        <div className="flex flex-col gap-6">
          {sets.length > 1 && (
            <div className="flex items-center gap-3">
              <label htmlFor="set-select" className="text-[14px] text-[--text-secondary]">Question set:</label>
              <select
                id="set-select"
                value={activeSetIndex}
                onChange={(e) => setActiveSetIndex(Number(e.target.value))}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50"
              >
                {sets.map((s) => (
                  <option key={s.setIndex} value={s.setIndex}>
                    {s.setIndex === 0 ? "Set 1 — Original" : `Set ${s.setIndex + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSet && (
            <Quiz
              lessonId={lessonId}
              setIndex={activeSet.setIndex}
              questions={activeSet.questions}
              flaggedQuestionIds={flaggedQuestionIds}
              onPassed={handlePassed}
            />
          )}

          {passed && (
            <div className="flex flex-col gap-3">
              {courseCompleted ? (
                <button
                  type="button"
                  onClick={() => router.push(`/learn/${courseId}/complete`)}
                  className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
                >
                  View Completion Certificate →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/learn/${courseId}`)}
                  className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
                >
                  Next Lesson →
                </button>
              )}

              <button
                type="button"
                disabled={isPending}
                onClick={handleMoreQuestions}
                className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg border border-[--border] text-[15px] font-medium text-[--text-primary] hover:bg-[--bg-surface] disabled:opacity-50 transition-colors"
              >
                {isPending ? "Generating…" : "I want more questions"}
              </button>

              {moreQuestionsError && (
                <p className="text-[14px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  {moreQuestionsError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showQuiz && sets.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-[15px] text-amber-800">No quiz available for this lesson — transcript was unavailable during generation.</p>
          <button
            type="button"
            onClick={() => router.push(`/learn/${courseId}`)}
            className="mt-3 inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[14px] font-semibold"
          >
            Continue to Next Lesson
          </button>
        </div>
      )}
    </div>
  )
}
```

### Step 3: Rewrite `src/components/learn/quiz.tsx`

- [ ] Replace the entire file:

```typescript
"use client"

import { useState } from "react"
import { submitQuiz } from "@/actions/submit-quiz"
import { flagQuestion } from "@/actions/flag-question"

type QuestionData = { id: string; questionText: string; options: string[] }

type Props = {
  lessonId: string
  setIndex: number
  questions: QuestionData[]
  flaggedQuestionIds: string[]
  onPassed: (courseCompleted: boolean) => void
}

export function Quiz({ lessonId, setIndex, questions, flaggedQuestionIds, onPassed }: Props) {
  const [selected, setSelected] = useState<(number | null)[]>(questions.map(() => null))
  const [result, setResult] = useState<{ passed: boolean; score: number; wrongIndexes?: number[]; courseCompleted?: boolean } | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [flagged, setFlagged] = useState<Set<string>>(new Set(flaggedQuestionIds))

  const allAnswered = selected.every((s) => s !== null)

  async function handleSubmit() {
    if (!allAnswered) return
    setIsPending(true)
    const res = await submitQuiz(lessonId, selected as number[], setIndex)
    setResult(res)
    setIsPending(false)
    if (res.passed) {
      setTimeout(() => onPassed(res.courseCompleted ?? false), 1500)
    }
  }

  function handleRetry() {
    setSelected(questions.map(() => null))
    setResult(null)
  }

  async function handleFlag(questionId: string) {
    const res = await flagQuestion(questionId)
    if ("error" in res) return
    setFlagged((prev) => {
      const next = new Set(prev)
      if (res.flagged) next.add(questionId)
      else next.delete(questionId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[20px] font-semibold text-[--text-primary]">
        Comprehension Quiz{setIndex > 0 ? ` — Set ${setIndex + 1}` : ""}
      </h2>
      <p className="text-[13px] text-[--text-secondary] -mt-4">Questions are based on general best practices for this topic and may not reflect the specific approach taken in the video.</p>

      {questions.map((q, qi) => (
        <div key={q.id} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-medium text-[--text-primary]">{qi + 1}. {q.questionText}</p>
            <button
              type="button"
              onClick={() => handleFlag(q.id)}
              title={flagged.has(q.id) ? "Remove flag" : "Flag this question"}
              className={`shrink-0 mt-0.5 text-[13px] px-2 py-0.5 rounded border transition-colors ${
                flagged.has(q.id)
                  ? "border-amber-400 text-amber-700 bg-amber-50"
                  : "border-[--border] text-[--text-secondary] hover:border-amber-400 hover:text-amber-600"
              }`}
            >
              {flagged.has(q.id) ? "⚑ Flagged" : "⚐ Flag"}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => {
              const isSelected = selected[qi] === oi
              const isWrong = result && !result.passed && result.wrongIndexes?.includes(qi) && isSelected
              const isCorrect = result && !result.passed && isSelected && !isWrong

              return (
                <button
                  key={oi}
                  type="button"
                  disabled={!!result || isPending}
                  onClick={() => setSelected((prev) => { const next = [...prev]; next[qi] = oi; return next })}
                  className={`text-left px-4 py-3 rounded-lg border text-[14px] transition-colors disabled:cursor-default ${
                    isCorrect
                      ? "border-green-500 bg-green-50 text-green-800"
                      : isWrong
                      ? "border-red-400 bg-red-50 text-red-800"
                      : isSelected
                      ? "border-[#F05A2A] bg-[#F05A2A]/10 text-[#F05A2A]"
                      : "border-[--border] bg-[--bg-surface] text-[--text-primary] hover:border-[#F05A2A]/50"
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {!result && (
        <button
          type="button"
          disabled={!allAnswered || isPending}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Checking…" : "Submit Quiz"}
        </button>
      )}

      {result && (
        <div className={`rounded-xl border p-5 ${result.passed ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50"}`}>
          {result.passed ? (
            <p className="text-[16px] font-semibold text-green-800">
              {result.courseCompleted ? "Course complete! 🎉" : "You passed!"} ({result.score}%)
            </p>
          ) : (
            <>
              <p className="text-[16px] font-semibold text-red-800 mb-1">You did not pass ({result.score}%)</p>
              <p className="text-[14px] text-red-700 mb-4">Minimum passing score is 70%. Correct answers are highlighted above.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg border border-red-400 text-[14px] font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                Retry Quiz
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Manual smoke test — lesson flow**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run dev
```

1. Open a course and navigate to a lesson
2. Watch video → quiz unlocks
3. Answer questions → verify set selector is hidden (only one set)
4. Pass the quiz → "Next Lesson" and "I want more questions" both appear
5. Click "I want more questions" → new set generates → set selector dropdown appears with "Set 1 — Original" and "Set 2"
6. Switch sets via dropdown → quiz updates
7. Click the ⚐ flag button on a question → button changes to "⚑ Flagged", click again → unflagged

- [ ] **Step 6: Commit**

```bash
git add "src/app/learn/[courseId]/[lessonId]/page.tsx" src/components/learn/lesson-player.tsx src/components/learn/quiz.tsx
git commit -m "feat(learn): on-demand question sets, set selector, flag buttons"
```

---

## Task 6: Course completion page

**Files:**
- Create: `src/app/learn/[courseId]/complete/page.tsx`

- [ ] **Step 1: Create the completion page**

```typescript
import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { courses, lessons, courseCompletions, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function CompletePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) notFound()

  const courseLessons = await db.query.lessons.findMany({ where: eq(lessons.courseId, courseId) })

  const creator = await db.query.users.findFirst({ where: eq(users.id, course.creatorId) })

  // Find the most recent completion for this course (any user) — used for public display
  // The page is publicly accessible; it shows the completion record for anyone who lands on it
  const completion = await db.query.courseCompletions.findFirst({
    where: eq(courseCompletions.courseId, courseId),
    orderBy: (c, { desc }) => [desc(c.completedAt)],
  })

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-center justify-center px-4">
      <div className="w-full max-w-[520px] text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center mx-auto mb-6">
          <span className="text-[28px]">✓</span>
        </div>

        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-2">
          Course Complete
        </h1>
        <p className="text-[16px] text-[--text-secondary] mb-8">
          {course.title}
        </p>

        <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 mb-8 text-left flex flex-col gap-3">
          <div className="flex justify-between text-[14px]">
            <span className="text-[--text-secondary]">Created by</span>
            <span className="text-[--text-primary] font-medium">{creator?.displayName ?? creator?.email ?? "Unknown"}</span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="text-[--text-secondary]">Lessons completed</span>
            <span className="text-[--text-primary] font-medium">{courseLessons.length}</span>
          </div>
          {completion && (
            <div className="flex justify-between text-[14px]">
              <span className="text-[--text-secondary]">Completed on</span>
              <span className="text-[--text-primary] font-medium">
                {completion.completedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
          <Link
            href={`/learn/${courseId}`}
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg border border-[--border] text-[15px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors"
          >
            Review Course
          </Link>
        </div>
      </div>
    </div>
  )
}
```

**Note:** The completion page queries the most recent completion for the course, not a specific user. Since this is a public shareable page, any visitor sees the course record. For v3, add `/learn/[courseId]/complete?userId=...` to show a specific user's completion (needed for social sharing with verification).

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep "complete"
```

Expected: 0 errors.

- [ ] **Step 3: Manual test — complete a course**

1. Navigate through all lessons of a short test course, pass every quiz
2. On the final lesson — after passing — "View Completion Certificate →" button appears
3. Click it → lands on `/learn/<courseId>/complete`
4. Page shows course title, creator name, lesson count, completion date

- [ ] **Step 4: Commit**

```bash
git add "src/app/learn/[courseId]/complete/page.tsx"
git commit -m "feat(learn): add course completion page"
```

---

## Task 7: Update dashboard with learner sections + edit page with flag counts

### Part A: Dashboard

The dashboard currently shows only "My Courses" (courses the user created). Add two sections below: "In Progress" and "Completed" — courses the user is learning (started but not completed, or completed).

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard.tsx to load learner data**

Add to the imports:
```typescript
import { courses, userProgress, courseCompletions } from "@/lib/db/schema"
import { eq, desc, inArray } from "drizzle-orm"
```

Add these queries after `userCourses`:
```typescript
  // Courses the user is learning (has progress but didn't create)
  const progressRows = await db.query.userProgress.findMany({
    where: eq(userProgress.userId, session.userId),
  })
  const learningCourseIds = [...new Set(progressRows.map((p) => p.courseId))]

  const [completionRows, learningCourses] = await Promise.all([
    learningCourseIds.length
      ? db.query.courseCompletions.findMany({
          where: (c, { and, eq, inArray }) => and(
            eq(c.userId, session.userId),
            inArray(c.courseId, learningCourseIds)
          ),
        })
      : Promise.resolve([]),
    learningCourseIds.length
      ? db.query.courses.findMany({
          where: inArray(courses.id, learningCourseIds),
          orderBy: [desc(courses.createdAt)],
        })
      : Promise.resolve([]),
  ])

  const completedCourseIds = new Set(completionRows.map((c) => c.courseId))
  const inProgressCourses = learningCourses.filter((c) => !completedCourseIds.has(c.id))
  const completedCourses = learningCourses.filter((c) => completedCourseIds.has(c.id))
```

- [ ] **Step 2: Add "In Progress" and "Completed" sections to the JSX**

Add after the closing `</section>` of "My Courses":

```tsx
            {inProgressCourses.length > 0 && (
              <section>
                <h2 className="text-[20px] font-semibold text-[--text-primary] mb-4">In Progress</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inProgressCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/learn/${course.id}`}
                      className="rounded-xl border border-[--border] bg-[--bg-surface] p-5 shadow-sm hover:border-[#F05A2A]/40 transition-colors group"
                    >
                      <h3 className="text-[16px] font-semibold text-[--text-primary] leading-snug group-hover:text-[#F05A2A] transition-colors line-clamp-2 mb-2">
                        {course.title}
                      </h3>
                      <p className="text-[13px] text-[--text-secondary]">{course.lengthPreset}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {completedCourses.length > 0 && (
              <section>
                <h2 className="text-[20px] font-semibold text-[--text-primary] mb-4">Completed</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/learn/${course.id}/complete`}
                      className="rounded-xl border border-green-500/30 bg-green-50/50 p-5 shadow-sm hover:border-green-500/60 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-[16px] font-semibold text-[--text-primary] leading-snug group-hover:text-green-700 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-green-500/30 text-green-600 bg-green-100">
                          ✓ done
                        </span>
                      </div>
                      <p className="text-[13px] text-[--text-secondary]">{course.lengthPreset}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
```

### Part B: Edit page — flag counts per question

**Files:**
- Modify: `src/app/courses/[courseId]/edit/page.tsx`

- [ ] **Step 3: Add flag count data to the edit page**

Add to the imports:
```typescript
import { questions, questionFlags } from "@/lib/db/schema"
import { eq, inArray, sql } from "drizzle-orm"
```

Add after the `courseLessons` query:
```typescript
  // Load flag counts per question for this course's lessons
  const lessonIds = courseLessons.map((l) => l.id)
  const questionRows = lessonIds.length
    ? await db.query.questions.findMany({
        where: inArray(questions.lessonId, lessonIds),
      })
    : []

  const questionIds = questionRows.map((q) => q.id)
  const flagCounts = questionIds.length
    ? await db
        .select({ questionId: questionFlags.questionId, count: sql<number>`cast(count(*) as int)` })
        .from(questionFlags)
        .where(inArray(questionFlags.questionId, questionIds))
        .groupBy(questionFlags.questionId)
    : []

  const flagCountMap = new Map(flagCounts.map((f) => [f.questionId, f.count]))

  // Group questions with flag counts by lessonId
  const questionsByLesson = new Map<string, { id: string; questionText: string; flagCount: number }[]>()
  for (const q of questionRows) {
    if (!questionsByLesson.has(q.lessonId)) questionsByLesson.set(q.lessonId, [])
    questionsByLesson.get(q.lessonId)!.push({
      id: q.id,
      questionText: q.questionText,
      flagCount: flagCountMap.get(q.id) ?? 0,
    })
  }
```

- [ ] **Step 4: Render flagged questions in each lesson row**

Inside the lesson map, after the `<LessonActions .../>` block, add:
```tsx
                  {(() => {
                    const lessonQs = questionsByLesson.get(lesson.id) ?? []
                    const flaggedQs = lessonQs.filter((q) => q.flagCount > 0)
                    if (!flaggedQs.length) return null
                    return (
                      <div className="mt-3 flex flex-col gap-1 border-t border-[--border] pt-3">
                        <p className="text-[12px] font-medium text-amber-700 mb-1">Flagged questions</p>
                        {flaggedQs.map((q) => (
                          <div key={q.id} className="flex items-start justify-between gap-2">
                            <p className="text-[13px] text-[--text-secondary] leading-snug line-clamp-2">{q.questionText}</p>
                            <span className="shrink-0 text-[12px] px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 bg-amber-50">
                              {q.flagCount} flag{q.flagCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Manual end-to-end test**

1. Flag a question during a quiz (using the ⚐ button)
2. Navigate to `/courses/<courseId>/edit`
3. Verify the flagged question appears under its lesson with a flag count badge
4. Complete a full course → dashboard shows the course in "Completed" with a green "✓ done" badge
5. Click the completed course card → lands on `/learn/<courseId>/complete`

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/page.tsx "src/app/courses/[courseId]/edit/page.tsx"
git commit -m "feat(dashboard+edit): learner in-progress/completed sections, flag counts on edit page"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| `questions.setIndex` column | Task 1 |
| On-demand question sets (unlimited) | Task 3 + Task 5 |
| Quiz shows one set at a time | Task 5 — LessonPlayer `activeSetIndex` state |
| Dropdown to switch between sets | Task 5 — `<select>` in LessonPlayer |
| No-transcript warning (not console) | Task 3 returns `{ error: "noTranscript" }`; Task 5 shows amber warning UI |
| `question_flags` table | Task 1 |
| Single-tap flag toggle | Task 4 |
| Flag button visible during quiz | Task 5 — Quiz component |
| Creator sees flag counts per question | Task 7 — edit page |
| `course_completions` table | Task 1 |
| Written on final lesson quiz pass | Task 2 — submitQuiz |
| Shareable `/complete` page (public) | Task 6 |
| Dashboard: completed vs in-progress | Task 7 — dashboard |
| `submitQuiz` accepts `setIndex` | Task 2 |
| Redirect to `/complete` on final pass | Task 5 — LessonPlayer `courseCompleted` state |

All spec features covered.

### Type consistency check

- `submitQuiz(lessonId, answers, setIndex)` called from `Quiz` with all three args ✓
- `generateQuestionSet(lessonId)` returns `{ setIndex }` — used in LessonPlayer to update `activeSetIndex` ✓
- `flagQuestion(questionId)` returns `{ flagged: boolean }` — used in Quiz flag handler ✓
- `onPassed(courseCompleted: boolean)` — Quiz calls it, LessonPlayer provides it ✓
- `QuestionSet = { setIndex: number; questions: QuestionData[] }` — defined in LessonPlayer, passed from page ✓
- `questionSets` prop replaces old `questions` prop on LessonPlayer — page updated to use `questionSets` ✓

### Edge cases

- **User completes their own created course:** `course_completions` writes correctly; dashboard may show the course in both "My Courses" and "Completed" — that's intentional and fine.
- **Course with no-video lessons:** `submitQuiz` completion check: `!l.youtubeVideoId || passedLessonIds.has(l.id)` — no-video lessons are skipped via `SkipLessonButton` which sets `passedQuiz: true`, so they appear in `passedLessonIds`. Completion detection is correct.
- **Multiple users flagging same question:** `unique(questionId, userId)` prevents double-flags; `flagQuestion` toggles correctly.
- **Requesting more questions with no transcript:** Returns `{ error: "noTranscript" }` — LessonPlayer shows the amber warning. No generation attempted.
