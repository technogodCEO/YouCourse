# Development

## Running Locally

```bash
npm run dev    # starts Next.js with Turbopack on localhost:3000
npm run build  # production build
npm run lint   # ESLint
```

## Project Structure

```
src/
  actions/      Server Actions — one file per domain (generate-course, submit-quiz, etc.)
  app/          Next.js App Router pages and layouts
    (auth)/     Login and signup pages (grouped layout, no shared nav)
    courses/    Course detail and edit pages
    dashboard/  Creator dashboard
    generate/   Course generation form and loading state
    learn/      Learner flow — course overview and lesson player
  components/   UI components grouped by domain (auth/, course/, learn/)
  lib/
    ai/         LLM calls — curriculum.ts (topic → lesson list), questions.ts (transcript → quiz)
    youtube/    search.ts (YouTube API), transcript.ts (caption fetch)
    db/         schema.ts (Drizzle schema), index.ts (Neon client)
    auth.ts     Auth.js v5 configuration
    dal.ts      verifySession() — call this at the top of any Server Action or page needing auth
    session.ts  Session helpers
```

## Database Changes

Edit `src/lib/db/schema.ts`, then:

```bash
npm run db:push
```

`drizzle-kit push` is fine for dev (schema push, no migration files). Use `drizzle-kit generate` + `drizzle-kit migrate` for production changes.

## Adding a Server Action

1. Create or add to a file in `src/actions/`
2. Add `"use server"` at the top
3. Call `verifySession()` first for any authenticated action
4. Import and call from a Client Component or Server Component as needed

## AI / LLM Changes

Both LLM calls use Groq via the Vercel AI SDK. The model is `llama-3.3-70b-versatile`. To swap providers, change the import in `src/lib/ai/curriculum.ts` and `src/lib/ai/questions.ts` — the `generateText` / `generateObject` API is provider-agnostic.

## YouTube API Quota

The YouTube Data API costs ~100 units per search + ~1 unit per video details call. The free tier gives 10,000 units/day. During dev, avoid triggering full course generation repeatedly — use short "quick" courses (3 lessons) to conserve quota.
