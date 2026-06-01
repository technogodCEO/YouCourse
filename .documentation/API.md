# API Reference

YouCourse has one HTTP route and several Server Actions. Server Actions are called directly from React components — they don't have REST URLs, but they're documented here for clarity.

## HTTP Routes

### `GET/POST /api/auth/[...nextauth]`
Auth.js v5 catch-all handler. Handles session creation, credential validation, and OAuth callbacks. Managed by Auth.js — do not call directly.

## Server Actions

All actions are in `src/actions/`. They run server-side only and validate session before doing anything.

---

### `generateCourse(formData: FormData)`
**File:** `src/actions/generate-course.ts`

Runs the full course generation pipeline:
1. Creates a `courses` row with `status: "generating"`
2. Calls Groq to generate an ordered list of lesson topics
3. For each topic: searches YouTube, fetches transcript, generates 5 questions
4. Updates `courses.status` to `"ready"` when complete

**Input fields:** `topic` (string), `lengthPreset` ("quick" | "standard" | "long")

**Returns:** `{ courseId: string }` on success, `{ error: string }` on failure

---

### `submitQuiz(lessonId, courseId, answers)`
**File:** `src/actions/submit-quiz.ts`

Scores a quiz attempt. If the learner passes (≥70%), writes a `userProgress` row with `passedQuiz: true`.

**Returns:** `{ passed: boolean, score: number, correctAnswers: number, total: number }`

---

### `updateCourse(courseId, data)`
**File:** `src/actions/update-course.ts`

Updates `title`, `description`, and/or `visibility` on a course. Only the course creator can call this.

---

### `deleteCourse(courseId)`
**File:** `src/actions/delete-course.ts`

Deletes a course and cascades to all lessons, questions, and progress rows.

---

### `initProgress(courseId)`
**File:** `src/actions/init-progress.ts`

Creates initial `userProgress` stubs for a learner starting a course for the first time.

---

### `skipLesson(lessonId, courseId)`
**File:** `src/actions/skip-lesson.ts`

Marks a lesson as passed without a quiz attempt. Available as an escape hatch for lessons with missing or bad questions.
