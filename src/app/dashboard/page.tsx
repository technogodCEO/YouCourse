import Link from "next/link"
import { getUser } from "@/lib/dal"
import { db } from "@/lib/db"
import { courses, userProgress, courseCompletions } from "@/lib/db/schema"
import { eq, desc, inArray } from "drizzle-orm"
import { verifySession } from "@/lib/dal"
import { SiteHeader } from "@/components/nav/site-header"

export default async function DashboardPage() {
  const [user, session] = await Promise.all([getUser(), verifySession()])

  const userCourses = await db.query.courses.findMany({
    where: eq(courses.creatorId, session.userId),
    orderBy: [desc(courses.createdAt)],
  })

  const progressRows = await db.query.userProgress.findMany({
    where: eq(userProgress.userId, session.userId),
  })
  const learningCourseIds = [...new Set(progressRows.map((p) => p.courseId))]

  const [completionRows, learningCourses] = await Promise.all([
    learningCourseIds.length
      ? db.query.courseCompletions.findMany({
          where: (c, { and, eq, inArray }) => and(eq(c.userId, session.userId), inArray(c.courseId, learningCourseIds)),
        })
      : Promise.resolve([]),
    learningCourseIds.length
      ? db.query.courses.findMany({ where: inArray(courses.id, learningCourseIds), orderBy: [desc(courses.createdAt)] })
      : Promise.resolve([]),
  ])

  const completedCourseIds = new Set(completionRows.map((c) => c.courseId))
  const inProgressCourses = learningCourses.filter((c) => !completedCourseIds.has(c.id))
  const completedCourses = learningCourses.filter((c) => completedCourseIds.has(c.id))

  return (
    <div className="min-h-screen bg-[--bg-base] flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <section className="flex items-center justify-between">
              <div>
                <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-1">Welcome back{user?.displayName ? `, ${user.displayName}` : ""}</h1>
                <p className="text-[16px] text-[--text-secondary]">{user?.email}</p>
              </div>
              <Link href="/generate" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold leading-none shadow-sm hover:opacity-90 transition-opacity">
                + Create Course
              </Link>
            </section>

            <section>
              <h2 className="text-[20px] font-semibold text-[--text-primary] mb-4">My Courses</h2>
              {userCourses.length === 0 ? (
                <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-8 text-center">
                  <p className="text-[16px] text-[--text-secondary] mb-4">You haven&apos;t created a course yet. Build one from any topic in minutes.</p>
                  <Link href="/generate" className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity">Generate Your First Course</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userCourses.map((course) => (
                    <Link key={course.id} href={`/courses/${course.id}`} className="rounded-xl border border-[--border] bg-[--bg-surface] p-5 shadow-sm hover:border-[#F05A2A]/40 transition-colors group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-[16px] font-semibold text-[--text-primary] leading-snug group-hover:text-[#F05A2A] transition-colors line-clamp-2">{course.title}</h3>
                        <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${course.status === "ready" ? "border-green-500/30 text-green-600 bg-green-50" : course.status === "generating" ? "border-amber-400/40 text-amber-600 bg-amber-50" : "border-red-400/30 text-red-600 bg-red-50"}`}>{course.status}</span>
                      </div>
                      <p className="text-[13px] text-[--text-secondary]">{course.lengthPreset} • {course.visibility}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {inProgressCourses.length > 0 && (
              <section>
                <h2 className="text-[20px] font-semibold text-[--text-primary] mb-4">In Progress</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inProgressCourses.map((course) => (
                    <Link key={course.id} href={`/learn/${course.id}`} className="rounded-xl border border-[--border] bg-[--bg-surface] p-5 shadow-sm hover:border-[#F05A2A]/40 transition-colors group">
                      <h3 className="text-[16px] font-semibold text-[--text-primary] leading-snug group-hover:text-[#F05A2A] transition-colors line-clamp-2 mb-2">{course.title}</h3>
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
                    <Link key={course.id} href={`/learn/${course.id}/complete`} className="rounded-xl border border-green-500/30 bg-green-50/50 p-5 shadow-sm hover:border-green-500/60 transition-colors group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-[16px] font-semibold text-[--text-primary] leading-snug group-hover:text-green-700 transition-colors line-clamp-2">{course.title}</h3>
                        <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-green-500/30 text-green-600 bg-green-100">✓ done</span>
                      </div>
                      <p className="text-[13px] text-[--text-secondary]">{course.lengthPreset}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
