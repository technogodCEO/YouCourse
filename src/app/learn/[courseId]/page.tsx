import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { courses, lessons, userProgress } from "@/lib/db/schema"
import { eq, asc, and } from "drizzle-orm"
import { verifySession } from "@/lib/dal"
import { initProgress } from "@/actions/init-progress"
import { SkipLessonButton } from "@/components/learn/skip-lesson-button"

function formatDuration(seconds: number | null): string {
  if (!seconds) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default async function LearnCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const session = await verifySession()

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) notFound()
  if (course.status !== "ready") redirect(`/courses/${courseId}`)

  await initProgress(courseId)

  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
    with: { videoCache: true },
  })

  const progressRows = await db.query.userProgress.findMany({
    where: and(eq(userProgress.userId, session.userId), eq(userProgress.courseId, courseId)),
  })

  const passedSet = new Set(progressRows.filter((p) => p.passedQuiz).map((p) => p.lessonId))

  let foundCurrent = false
  const lessonStates = courseLessons.map((lesson) => {
    if (passedSet.has(lesson.id)) return { lesson, state: "complete" as const }
    if (!foundCurrent) { foundCurrent = true; return { lesson, state: "current" as const } }
    return { lesson, state: "locked" as const }
  })

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-12">
        <Link href={`/courses/${courseId}`} className="text-[14px] text-[--text-secondary] hover:text-[--text-primary] mb-6 inline-block">
          ← Back to course
        </Link>
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-2">{course.title}</h1>
        <p className="text-[15px] text-[--text-secondary] mb-8">{courseLessons.length} lessons</p>
        <div className="flex flex-col gap-3">
          {lessonStates.map(({ lesson, state }, i) => (
            <div key={lesson.id} className={`flex items-start gap-4 rounded-xl border p-4 ${state === "current" ? "border-[#F05A2A] bg-[#F05A2A]/5" : state === "complete" ? "border-green-500/30 bg-green-50/50" : "border-[--border] bg-[--bg-surface] opacity-60"}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[13px] font-semibold">
                {state === "complete" ? <span className="text-green-600">✓</span> : <span className={state === "current" ? "text-[#F05A2A]" : "text-[--text-secondary]"}>{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-medium leading-snug ${state === "locked" ? "text-[--text-secondary]" : "text-[--text-primary]"}`}>
                  {lesson.videoCache?.title ?? lesson.topic}
                </p>
                {lesson.videoCache?.durationSeconds && (
                  <p className="text-[13px] text-[--text-secondary] mt-0.5">{formatDuration(lesson.videoCache.durationSeconds)}</p>
                )}
              </div>
              {(state === "current" || state === "complete") && lesson.youtubeVideoId && (
                <Link href={`/learn/${courseId}/${lesson.id}`} className={`shrink-0 inline-flex items-center justify-center min-h-[36px] px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${state === "current" ? "bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white hover:opacity-90" : "border border-green-500/40 text-green-700 hover:bg-green-50"}`}>
                  {state === "current" ? "Start" : "Review"}
                </Link>
              )}
              {state === "current" && !lesson.youtubeVideoId && (
                <SkipLessonButton lessonId={lesson.id} courseId={courseId} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
