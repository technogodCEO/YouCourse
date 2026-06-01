# Testing

There are no automated tests yet. The project shipped under hackathon constraints; testing is a v2 concern.

## Manual Testing Checklist

### Auth
- [ ] Sign up with a new email → redirects to dashboard
- [ ] Log in with correct credentials → session persists across refresh
- [ ] Access `/dashboard` while logged out → redirects to `/login`

### Course Generation
- [ ] Submit topic + Quick preset → course appears with 3 lessons after ~30s
- [ ] Each lesson has a YouTube video and 5 questions
- [ ] Lessons where transcript was unavailable show appropriate status

### Learner Flow
- [ ] Open a published course → first lesson is unlocked, rest are locked
- [ ] Watch video, answer quiz with ≥70% → next lesson unlocks
- [ ] Answer quiz with <70% → fail state shown, retry available
- [ ] Close and reopen course → resumes from last completed lesson
- [ ] Attempt to navigate directly to a locked lesson URL → redirects to course overview

### Creator Controls
- [ ] Edit course title and description → saved correctly
- [ ] Toggle visibility between public/private → enforced on next load
- [ ] Delete course → removed from dashboard

## Adding Tests

When tests are added, use [Vitest](https://vitest.dev) for unit tests and [Playwright](https://playwright.dev) for E2E. The most critical paths to cover are the quiz gate logic (`src/actions/submit-quiz.ts`) and the generation pipeline (`src/actions/generate-course.ts`).
