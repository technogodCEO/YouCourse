# v2 Phase 3: Discovery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make public courses findable without a direct link. Anonymous users can browse, search, and filter the catalog. Public course pages are visible without auth and crawlable. A shared site header surfaces the catalog entry point across all pages.

**Architecture:** Four changes work together: (1) `/courses` removed from middleware-protected routes so the course detail page handles its own auth; (2) a new `getOptionalSession()` in `dal.ts` replaces `verifySession()` on the course detail page; (3) `generateMetadata` on course pages enables SEO and social sharing; (4) a new `/catalog` Server Component page loads all public courses via `unstable_cache`, filters in-memory from URL `searchParams`, and renders without auth. A shared `SiteHeader` component is added to the homepage, dashboard, catalog, and course detail pages.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + Neon, `unstable_cache` (60s TTL), Tailwind CSS v4, TypeScript strict.

**Branch strategy:** Execute on branch `v2/phase3` cut from `main` after Phase 2 is merged. Open a PR to `main` when all tasks are complete.

---

## Design decisions recorded here

- **Search:** Submit-only. Catalog page is a Server Component; search query and length filter travel as URL `searchParams` (GET form). No client-side debouncing.
- **Anonymous access:** `getOptionalSession()` returns `null` (no redirect) for unauthenticated users. Public course detail pages are fully visible. Anonymous users hit the `/learn` auth gate when they click "Start Learning" — the middleware already protects `/learn`.
- **`/courses` middleware protection removed:** The edit page calls `verifySession()` directly, so removing `/courses` from `protectedRoutes` does not reduce security — it removes the redundant pre-check that was blocking anonymous course viewing.
- **Catalog caching:** `unstable_cache` wraps the full public courses query with 60s revalidation. In-memory filtering on the cached result handles search + length filter — avoids per-request DB hits while keeping the catalog fresh.
- **`generateMetadata` deduplication:** Uses React `cache()` to wrap the course DB fetch so `generateMetadata` and the page component share one DB call per request.
- **`coursesRelations`:** Added to `schema.ts` so the catalog can load creator `displayName` in a single query via `with: { creator: true }`.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/db/schema.ts` | Modify | Add `coursesRelations` (courses → creator user + lessons) |
| `src/lib/dal.ts` | Modify | Add `getOptionalSession()` — returns `null` instead of redirecting |
| `src/lib/auth.config.ts` | Modify | Remove `/courses` from `protectedRoutes` |
| `src/app/courses/[courseId]/page.tsx` | Modify | Use `getOptionalSession()`; add `generateMetadata`; show "Sign in to Start Learning" for anonymous users; add `SiteHeader` |
| `src/components/nav/site-header.tsx` | Create | Shared server component — logo, Browse link, auth-aware user nav |
| `src/app/page.tsx` | Modify | Use `SiteHeader`; add "Browse courses" CTA alongside existing CTAs |
| `src/app/dashboard/page.tsx` | Modify | Replace inline header with `SiteHeader` |
| `src/app/catalog/page.tsx` | Create | Public catalog — `unstable_cache`, submit search form, length filter chips, course grid |

---

## Task 1: Schema `coursesRelations` + `getOptionalSession()`

Two small additions that unlock the rest of the phase.

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/dal.ts`

- [ ] **Step 1: Add `coursesRelations` to schema.ts**

Add this after the `courses` table definition (and after the `lessons` table, since `many(lessons)` references it):

```typescript
export const coursesRelations = relations(courses, ({ one, many }) => ({
  creator: one(users, {
    fields: [courses.creatorId],
    references: [users.id],
  }),
  lessons: many(lessons),
}))
```

Also add a `usersRelations` export to allow the reverse lookup (needed by Drizzle's relational query builder to resolve `with: { creator: true }` from the `courses` side):

```typescript
export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
}))
```

No `db:push` needed — relations are TypeScript-only metadata, not schema changes.

- [ ] **Step 2: Add `getOptionalSession()` to dal.ts**

```typescript
export async function getOptionalSession(): Promise<{ userId: string } | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return { userId: session.user.id as string }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts src/lib/dal.ts
git commit -m "feat(schema+dal): coursesRelations, getOptionalSession"
```

---

## Task 2: Remove `/courses` from middleware protection + update course detail page

**Files:**
- Modify: `src/lib/auth.config.ts`
- Modify: `src/app/courses/[courseId]/page.tsx`

### Step 1: Un-protect `/courses` in middleware

- [ ] In `src/lib/auth.config.ts`, change:

```typescript
const protectedRoutes = ["/dashboard", "/courses", "/generate", "/learn"]
```

to:

```typescript
const protectedRoutes = ["/dashboard", "/generate", "/learn"]
```

The course edit page (`/courses/[courseId]/edit`) calls `verifySession()` directly — removing it from the middleware list does not expose it; the page-level guard remains.

### Step 2: Rewrite the course detail page for anonymous access + `generateMetadata`

- [ ] Replace the entire `src/app/courses/[courseId]/page.tsx`:

```typescript
import { notFound } from "next/navigation"
import Link from "next/link"
import { cache } from "react"
import { db } from "@/lib/db"
import { courses, lessons } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { CoursePoller } from "@/components/course/course-poller"
import { DeleteCourseButton } from "@/components/course/delete-course-button"
import { CopyLinkButton } from "@/components/course/copy-link-button"
import { getOptionalSession } from "@/lib/dal"
import { SiteHeader } from "@/components/nav/site-header"
import type { Metadata } from "next"

const getCourse = cache(async (courseId: string) => {
  return db.query.courses.findFirst({ where: eq(courses.id, courseId) })
})

export async function generateMetadata(
  { params }: { params: Promise<{ courseId: string }> }
): Promise<Metadata> {
  const { courseId } = await params
  const course = await getCourse(courseId)
  if (!course || course.visibility !== "public") {
    return { robots: { index: false } }
  }
  const description =
    course.description?.slice(0, 160) ??
    `Learn ${course.topic} with AI-curated YouTube videos and comprehension quizzes.`
  return {
    title: `${course.title} — YouCourse`,
    description,
    openGraph: { title: `${course.title} — YouCourse`, description },
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const session = await getOptionalSession()

  const course = await getCourse(courseId)
  if (!course) notFound()

  const isOwner = !!session && course.creatorId === session.userId

  if (course.visibility === "private" && !isOwner) notFound()

  if (course.status === "generating") {
    return (
      <div className="min-h-screen bg-[--bg-base] flex items-center justify-center">
        <CoursePoller />
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#F05A2A] border-t-transparent animate-spin mx-auto mb-4" />
          <h1 className="text-[22px] font-semibold text-[--text-primary] mb-2">Generating your course…</h1>
          <p className="text-[15px] text-[--text-secondary]">This usually takes 10–30 seconds.</p>
        </div>
      </div>
    )
  }

  if (course.status === "error") {
    return (
      <div className="min-h-screen bg-[--bg-base] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold text-[--text-primary] mb-2">Course generation failed</h1>
          <p className="text-[15px] text-[--text-secondary] mb-6">Something went wrong. Please try again.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/generate" className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[15px] font-semibold">
              Try Again
            </Link>
            {isOwner && <DeleteCourseButton courseId={courseId} />}
          </div>
        </div>
      </div>
    )
  }

  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
    with: { videoCache: true },
  })

  const hasStarted = session
    ? !!(await db.query.userProgress.findFirst({
        where: (p, { and, eq }) => and(eq(p.userId, session.userId), eq(p.courseId, courseId)),
      }))
    : false

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}`

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <SiteHeader />
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-12">
        <Link href="/catalog" className="text-[14px] text-[--text-secondary] hover:text-[--text-primary] mb-6 inline-block">
          ← Browse courses
        </Link>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary]">{course.title}</h1>
          {isOwner && (
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/courses/${courseId}/edit`}
                className="inline-flex items-center min-h-[36px] px-4 py-2 rounded-lg border border-[--border] text-[14px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors"
              >
                Edit
              </Link>
              <DeleteCourseButton courseId={courseId} />
            </div>
          )}
        </div>
        {course.description && (
          <p className="text-[16px] text-[--text-secondary] mb-2">{course.description}</p>
        )}
        <div className="flex items-center gap-3 mb-8">
          <span className={`text-[13px] px-2 py-0.5 rounded-full border ${course.visibility === "public" ? "border-green-500/30 text-green-600 bg-green-50" : "border-[--border] text-[--text-secondary]"}`}>
            {course.visibility === "public" ? "Public" : "Private"}
          </span>
          <span className="text-[13px] text-[--text-secondary]">{courseLessons.length} lessons</span>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {courseLessons.map((lesson, i) => (
            <div key={lesson.id} className="flex items-start gap-4 rounded-xl border border-[--border] bg-[--bg-surface] p-4">
              <span className="text-[13px] font-mono text-[--text-secondary] mt-0.5 w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[--text-primary] leading-snug">
                  {lesson.videoCache?.title ?? lesson.topic}
                </p>
                {lesson.videoCache?.durationSeconds && (
                  <p className="text-[13px] text-[--text-secondary] mt-0.5">{formatDuration(lesson.videoCache.durationSeconds)}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={session ? `/learn/${courseId}` : `/login?redirect=/learn/${courseId}`}
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            {session
              ? hasStarted ? "Continue Learning" : "Start Learning"
              : "Sign in to Start Learning"}
          </Link>
          {course.visibility === "public" && <CopyLinkButton url={shareUrl} />}
        </div>
      </div>
    </div>
  )
}
```

**Note on `redirect` in `login?redirect=...`:** The `proxy.ts` middleware redirects to `/login` when a user hits `/learn` without auth — no redirect param is needed for the auth gate to work. The explicit `?redirect=` here is a UX hint only; implementing it requires reading the param in the login action and is out of Phase 3 scope. The link simply sends anonymous users to `/login`.

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit 2>&1 | grep -E "auth.config|courses/\[courseId\]"
```

Expected: 0 errors.

- [ ] **Step 4: Smoke test anonymous course access**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run dev
```

In an incognito window: navigate to `http://localhost:3000/courses/<any-public-courseId>`. Verify the page loads without redirecting to login. Verify the "Sign in to Start Learning" button appears.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.config.ts "src/app/courses/[courseId]/page.tsx"
git commit -m "feat(auth+course): allow anonymous course page viewing, add generateMetadata"
```

---

## Task 3: Shared `SiteHeader` component + update homepage + dashboard

**Files:**
- Create: `src/components/nav/site-header.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create `src/components/nav/site-header.tsx`**

```typescript
import Link from "next/link"
import Image from "next/image"
import { getUser } from "@/lib/dal"
import { LogoutButton } from "@/components/auth/logout-button"

export async function SiteHeader() {
  const user = await getUser()

  return (
    <header className="sticky top-0 z-40 border-b border-[--border] bg-[--bg-surface]/95 backdrop-blur-sm">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/YouCourseLogo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-[16px] font-semibold text-[--text-primary]">YouCourse</span>
          </Link>
          <Link href="/catalog" className="text-[14px] font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">
            Browse
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="text-[14px] text-[--text-secondary] hover:text-[--text-primary] hidden sm:block transition-colors">
                {user.displayName ?? user.email}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-[15px] font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">
                Sign in
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[15px] font-semibold hover:opacity-90 transition-opacity">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Update `src/app/page.tsx` — use SiteHeader, add Browse CTA**

Replace the inline `<header>` block with `<SiteHeader />` and add a "Browse courses" link alongside the existing CTAs:

```typescript
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/nav/site-header"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[--bg-base] flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-[48px] sm:text-[64px] leading-tight font-bold text-[--text-primary] max-w-3xl mb-6">
          Learn anything from{" "}
          <span className="bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] bg-clip-text text-transparent">
            YouTube
          </span>
          , with proof you understood it
        </h1>
        <p className="text-[18px] sm:text-[20px] text-[--text-secondary] max-w-xl mb-10 leading-relaxed">
          Enter a topic. We build a course from real YouTube videos, generate comprehension questions, and gate each lesson until you pass.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="inline-flex items-center justify-center min-h-[52px] px-8 py-4 rounded-xl bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[18px] font-semibold shadow-md hover:opacity-90 transition-opacity">
            Build a course — it&apos;s free
          </Link>
          <Link href="/catalog" className="inline-flex items-center justify-center min-h-[52px] px-8 py-4 rounded-xl border border-[--border] text-[18px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors">
            Browse courses
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl w-full text-left">
          {[
            { title: "Enter a topic", body: "Type anything — 'Python for beginners', 'music theory', 'how to invest'. We do the rest." },
            { title: "AI builds the course", body: "We find the best YouTube videos, fetch transcripts, and generate comprehension questions automatically." },
            { title: "Learn with accountability", body: "Watch each video, answer questions, and pass to unlock the next lesson. No skipping." },
            { title: "Creators still get paid", body: "Every video plays directly on YouTube — ads run, views count, and creators earn. We just add the structure." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm">
              <h3 className="text-[16px] font-semibold text-[--text-primary] mb-2">{item.title}</h3>
              <p className="text-[14px] text-[--text-secondary] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/app/dashboard/page.tsx` — replace inline header with `SiteHeader`**

Remove the entire inline `<header>...</header>` block from `dashboard/page.tsx` and replace with `<SiteHeader />`. Also add the import.

The header block to remove starts with:
```typescript
      <header className="sticky top-0 z-40 border-b border-[--border] bg-[--bg-surface]/95 backdrop-blur-sm">
```
and ends with the closing `</header>`.

Add at the top of the return inside the outermost div:
```tsx
      <SiteHeader />
```

Also remove the now-unused imports from `dashboard/page.tsx`:
- `Image` from `"next/image"` (moved to SiteHeader)
- `LogoutButton` from `"@/components/auth/logout-button"` (moved to SiteHeader)

Keep `getUser` — the dashboard still uses `user.displayName` in the welcome heading.

- [ ] **Step 4: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Smoke test header across pages**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run dev
```

1. Homepage: SiteHeader shows logo + Browse + Sign in / Get started
2. Dashboard (logged in): SiteHeader shows logo + Browse + user name + logout
3. Course detail page: SiteHeader appears at top; back link now says "← Browse courses"

- [ ] **Step 6: Commit**

```bash
git add src/components/nav/site-header.tsx src/app/page.tsx src/app/dashboard/page.tsx
git commit -m "feat(nav): shared SiteHeader with Browse link; update homepage and dashboard"
```

---

## Task 4: Public catalog page

A server-rendered catalog page with `unstable_cache`, submit-only search, and length filter chips. No auth required.

**Files:**
- Create: `src/app/catalog/page.tsx`

- [ ] **Step 1: Create `src/app/catalog/page.tsx`**

```typescript
import Link from "next/link"
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"
import { courses } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { SiteHeader } from "@/components/nav/site-header"

type CourseWithMeta = {
  id: string
  title: string
  topic: string
  description: string | null
  lengthPreset: string
  createdAt: Date
  creator: { displayName: string | null; email: string } | null
  lessons: { id: string }[]
}

const getPublicCourses = unstable_cache(
  async (): Promise<CourseWithMeta[]> => {
    return db.query.courses.findMany({
      where: eq(courses.visibility, "public"),
      orderBy: [desc(courses.createdAt)],
      with: {
        creator: { columns: { displayName: true, email: true } },
        lessons: { columns: { id: true } },
      },
    }) as Promise<CourseWithMeta[]>
  },
  ["catalog-public-courses"],
  { revalidate: 60 }
)

const LENGTH_LABELS: Record<string, string> = {
  quick: "Quick",
  standard: "Standard",
  long: "Long",
}

type SearchParams = Promise<{ q?: string; length?: string }>

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, length } = await searchParams
  const query = q?.trim().toLowerCase() ?? ""
  const lengthFilter = length && ["quick", "standard", "long"].includes(length) ? length : ""

  const allCourses = await getPublicCourses()

  const filtered = allCourses.filter((course) => {
    if (lengthFilter && course.lengthPreset !== lengthFilter) return false
    if (query) {
      return (
        course.title.toLowerCase().includes(query) ||
        course.topic.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <SiteHeader />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-[32px] font-bold text-[--text-primary] mb-2">Browse Courses</h1>
        <p className="text-[16px] text-[--text-secondary] mb-8">
          AI-generated courses from YouTube. Watch, quiz, and prove your understanding.
        </p>

        {/* Search + filter form */}
        <form method="GET" action="/catalog" className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by topic or title…"
            className="flex-1 min-h-[44px] px-4 py-3 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50"
          />
          {/* Preserve length filter when submitting search */}
          {lengthFilter && <input type="hidden" name="length" value={lengthFilter} />}
          <button
            type="submit"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[15px] font-semibold hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </form>

        {/* Length filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {["", "quick", "standard", "long"].map((preset) => {
            const label = preset === "" ? "All" : LENGTH_LABELS[preset]
            const isActive = lengthFilter === preset

            const params = new URLSearchParams()
            if (q) params.set("q", q)
            if (preset) params.set("length", preset)
            const href = `/catalog${params.size ? `?${params}` : ""}`

            return (
              <Link
                key={preset}
                href={href}
                className={`inline-flex items-center min-h-[36px] px-4 py-1.5 rounded-full border text-[14px] font-medium transition-colors ${
                  isActive
                    ? "border-[#F05A2A] bg-[#F05A2A]/10 text-[#F05A2A]"
                    : "border-[--border] text-[--text-secondary] hover:border-[#F05A2A]/50 hover:text-[--text-primary]"
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-12 text-center">
            <p className="text-[16px] text-[--text-secondary]">
              {query || lengthFilter ? "No courses match your search." : "No public courses yet. Be the first to create one!"}
            </p>
            {(query || lengthFilter) && (
              <Link href="/catalog" className="mt-4 inline-flex items-center text-[14px] text-[#F05A2A] hover:underline">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="rounded-xl border border-[--border] bg-[--bg-surface] p-5 shadow-sm hover:border-[#F05A2A]/40 transition-colors group flex flex-col gap-3"
              >
                <div>
                  <h2 className="text-[16px] font-semibold text-[--text-primary] leading-snug group-hover:text-[#F05A2A] transition-colors line-clamp-2 mb-1">
                    {course.title}
                  </h2>
                  {course.description && (
                    <p className="text-[13px] text-[--text-secondary] line-clamp-2">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[12px] text-[--text-secondary]">
                    {course.creator?.displayName ?? course.creator?.email ?? "Unknown"} · {course.lessons.length} lessons
                  </span>
                  <span className="text-[12px] px-2 py-0.5 rounded-full border border-[--border] text-[--text-secondary]">
                    {LENGTH_LABELS[course.lengthPreset] ?? course.lengthPreset}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npx tsc --noEmit
```

Expected: 0 errors. If there are type errors on `with: { creator: ..., lessons: ... }`, ensure `coursesRelations` and `usersRelations` are exported from `schema.ts` (Task 1).

- [ ] **Step 3: Manual end-to-end test**

```bash
cd "/Users/roshankareer/VSCode Projects/YouCourse" && npm run dev
```

1. Create a course and set visibility to Public
2. Navigate to `http://localhost:3000/catalog` (in incognito) — course appears
3. Type in the search input → hit Enter → results filter by title/topic
4. Click a length filter chip → results filter by preset; active chip is highlighted
5. Clear filters link appears when filters are active → click it → full catalog restored
6. Click a course card → course detail page loads without login prompt
7. Click "Sign in to Start Learning" → redirects to `/login`
8. Log in → return to course page → button shows "Start Learning" / "Continue Learning"
9. Check page `<title>` and og:title in browser devtools for a public course — should be `{title} — YouCourse`
10. For a private course, check `<meta name="robots">` — should be `noindex`

- [ ] **Step 4: Commit**

```bash
git add src/app/catalog/page.tsx
git commit -m "feat(catalog): public course catalog with search, length filter, unstable_cache"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| `/catalog` — anonymous browsing, all public courses | Task 4 |
| `unstable_cache` with 60s TTL | Task 4 |
| Keyword search on title + topic | Task 4 — in-memory filter on cached result |
| Length filter chips (Quick / Standard / Long) | Task 4 |
| Anonymous users can see public course pages | Task 2 — `getOptionalSession()` + middleware change |
| Auth gate at "Start Learning" (not before) | Task 2 — link to `/login` for anon, `/learn/...` for authed |
| `generateMetadata` on public course pages | Task 2 — `generateMetadata` export |
| `noindex` on private course pages | Task 2 — `robots: { index: false }` when private |
| Browse/Catalog link in header for everyone | Task 3 — `SiteHeader` |
| Homepage updated with Browse CTA | Task 3 — `page.tsx` |

All spec features covered.

### Type consistency check

- `getOptionalSession()` returns `{ userId: string } | null` — used with null checks in course page ✓
- `getCourse` uses React `cache()` — called in both `generateMetadata` and page component; one DB query per request ✓
- `CourseWithMeta` type cast on `getPublicCourses` result — needed because Drizzle's inferred return type for `with` may not match exactly; cast is safe since the query shape is fixed ✓
- `SiteHeader` is a server component — `getUser()` is called server-side; `LogoutButton` is a client component nested inside, which is valid in Next.js App Router ✓
- Length filter chip links preserve `q` param while changing `length` — prevents losing search query when filtering ✓

### Security note

Removing `/courses` from `protectedRoutes` is safe because:
1. The course detail page uses `getOptionalSession()` — shows private courses only to owners (404 otherwise)
2. The edit page calls `verifySession()` — redirects to login if no session
3. The generate page retains `/generate` in `protectedRoutes`
4. No DB write is possible from the course detail page (it's read-only)
