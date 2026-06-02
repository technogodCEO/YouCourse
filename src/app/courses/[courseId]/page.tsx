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

export async function generateMetadata({ params }: { params: Promise<{ courseId: string }> }): Promise<Metadata> {
  const { courseId } = await params
  const course = await getCourse(courseId)
  if (!course || course.visibility !== "public") return { robots: { index: false } }
  const description = course.description?.slice(0, 160) ?? `Learn ${course.topic} with AI-curated YouTube videos and comprehension quizzes.`
  return { title: `${course.title} — YouCourse`, description, openGraph: { title: `${course.title} — YouCourse`, description } }
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
            <Link href="/generate" className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[15px] font-semibold">Try Again</Link>
            {isOwner && <DeleteCourseButton courseId={courseId} />}
          </div>
        </div>
      </div>
    )
  }

  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
  })

  const hasStarted = session
    ? !!(await db.query.userProgress.findFirst({ where: (p, { and, eq }) => and(eq(p.userId, session.userId), eq(p.courseId, courseId)) }))
    : false

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}`

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <SiteHeader />
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-12">
        <Link href="/catalog" className="text-[14px] text-[--text-secondary] hover:text-[--text-primary] mb-6 inline-block">← Browse courses</Link>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary]">{course.title}</h1>
          {isOwner && (
            <div className="flex gap-2 shrink-0">
              <Link href={`/courses/${courseId}/edit`} className="inline-flex items-center min-h-[36px] px-4 py-2 rounded-lg border border-[--border] text-[14px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors">Edit</Link>
              <DeleteCourseButton courseId={courseId} />
            </div>
          )}
        </div>
        {course.description && <p className="text-[16px] text-[--text-secondary] mb-2">{course.description}</p>}
        <div className="flex items-center gap-3 mb-8">
          <span className={`text-[13px] px-2 py-0.5 rounded-full border ${course.visibility === "public" ? "border-green-500/30 text-green-600 bg-green-50" : "border-[--border] text-[--text-secondary]"}`}>{course.visibility === "public" ? "Public" : "Private"}</span>
          <span className="text-[13px] text-[--text-secondary]">{courseLessons.length} lessons</span>
        </div>
        <div className="flex flex-col gap-3 mb-8">
          {courseLessons.map((lesson, i) => (
            <div key={lesson.id} className="flex items-start gap-4 rounded-xl border border-[--border] bg-[--bg-surface] p-4">
              <span className="text-[13px] font-mono text-[--text-secondary] mt-0.5 w-5 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[--text-primary] leading-snug">{lesson.videoTitle ?? lesson.topic}</p>
                {lesson.videoDuration && <p className="text-[13px] text-[--text-secondary] mt-0.5">{formatDuration(lesson.videoDuration)}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={session ? `/learn/${courseId}` : `/login`} className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity">
            {session ? (hasStarted ? "Continue Learning" : "Start Learning") : "Sign in to Start Learning"}
          </Link>
          {course.visibility === "public" && <CopyLinkButton url={shareUrl} />}
        </div>
      </div>
    </div>
  )
}
