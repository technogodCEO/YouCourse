# Architecture

YouCourse is a full-stack Next.js 16 app using the App Router. All data fetching and mutations happen server-side via Server Components and Server Actions — no separate API layer.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (next-auth beta) |
| AI | Vercel AI SDK + Groq (llama-3.3-70b-versatile) |
| YouTube | YouTube Data API v3 + youtube-transcript |

## Database Schema

```
users ──────────────────────────────────────────────────────┐
  id, email, password (bcrypt), displayName                  │
                                                             │
courses (creatorId → users.id) ─────────────────────────────┤
  title, topic, lengthPreset, visibility, status             │
                                                             │
lessons (courseId → courses.id) ─────────────────────────────┤
  position, topic, youtubeVideoId, transcriptCached,         │
  transcriptStatus, videoDurationSeconds                     │
                                                             │
questions (lessonId → lessons.id)                           │
  questionText, options (JSON), correctIndex, position       │
                                                             │
userProgress (userId → users.id, courseId, lessonId)        │
  passedQuiz, completedAt                                    │
```

## Course Generation Pipeline

When a user submits a topic and length preset, a single Server Action runs this pipeline synchronously:

1. **Curriculum generation** — Groq LLM generates N ordered lesson topics (3 / 6 / 10 for quick / standard / long)
2. **YouTube search** — for each topic, YouTube Data API v3 searches for a video with closed captions
3. **Transcript fetch** — `youtube-transcript` fetches captions and stores them in `lessons.transcriptCached`
4. **Question generation** — Groq LLM generates 5 comprehension questions per video from the cached transcript

Everything is written to the database during generation. No YouTube API calls happen after this point — all student views read from the DB.

## Learner Flow

Progress is tracked per `(userId, lessonId)` in `user_progress`. The gating logic runs server-side on every lesson page load: if any prior lesson lacks a `passedQuiz = true` row, the request redirects to the course overview. Quiz submissions hit a Server Action that scores answers, writes progress, and returns pass/fail.

## Auth

Auth.js v5 with email/password credentials. Sessions are JWT-based, validated via a custom `verifySession()` DAL function (`src/lib/dal.ts`). Route protection is handled by `src/proxy.ts` (Next.js middleware) and DAL checks within Server Actions.

## Key Files

```
src/
  actions/          Server Actions (generate-course, submit-quiz, etc.)
  app/              Routes — (auth)/, courses/, learn/, generate/, dashboard/
  components/       UI components grouped by domain
  lib/
    ai/             curriculum.ts, questions.ts (Groq calls)
    youtube/        search.ts, transcript.ts (YouTube API)
    db/             schema.ts, index.ts (Drizzle + Neon)
    auth.ts         Auth.js config
    dal.ts          verifySession() — call this at the top of any Server Action or page needing auth
    session.ts      Session helpers
```
