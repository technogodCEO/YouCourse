import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { courses, lessons, courseCompletions, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function CompletePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) notFound()

  const [courseLessons, creator, completion] = await Promise.all([
    db.query.lessons.findMany({ where: eq(lessons.courseId, courseId) }),
    db.query.users.findFirst({ where: eq(users.id, course.creatorId) }),
    db.query.courseCompletions.findFirst({
      where: eq(courseCompletions.courseId, courseId),
      orderBy: (c, { desc }) => [desc(c.completedAt)],
    }),
  ])

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-center justify-center px-4">
      <div className="w-full max-w-[520px] text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center mx-auto mb-6">
          <span className="text-[28px]">✓</span>
        </div>
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-2">Course Complete</h1>
        <p className="text-[16px] text-[--text-secondary] mb-8">{course.title}</p>
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
              <span className="text-[--text-primary] font-medium">{completion.completedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity">
            Back to Dashboard
          </Link>
          <Link href={`/learn/${courseId}`} className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg border border-[--border] text-[15px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors">
            Review Course
          </Link>
        </div>
      </div>
    </div>
  )
}
