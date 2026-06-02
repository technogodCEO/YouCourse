import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { courses, lessons, questions, questionFlags } from "@/lib/db/schema"
import { eq, asc, inArray, sql } from "drizzle-orm"
import { verifySession } from "@/lib/dal"
import { EditCourseForm } from "@/components/course/edit-course-form"
import { LessonActions } from "@/components/course/lesson-actions"

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const session = await verifySession()

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) notFound()
  if (course.creatorId !== session.userId) redirect("/dashboard")

  const courseLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
  })

  const lessonIds = courseLessons.map((l) => l.id)
  const questionRows = lessonIds.length
    ? await db.query.questions.findMany({ where: inArray(questions.lessonId, lessonIds) })
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
  const questionsByLesson = new Map<string, { id: string; questionText: string; flagCount: number }[]>()
  for (const q of questionRows) {
    if (!questionsByLesson.has(q.lessonId)) questionsByLesson.set(q.lessonId, [])
    questionsByLesson.get(q.lessonId)!.push({
      id: q.id,
      questionText: q.questionText,
      flagCount: flagCountMap.get(q.id) ?? 0,
    })
  }

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[640px]">
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-8">Edit Course</h1>
        <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm mb-8">
          <EditCourseForm courseId={courseId} defaultTitle={course.title} defaultDescription={course.description ?? null} defaultVisibility={course.visibility} />
        </div>
        <h2 className="text-[20px] font-semibold text-[--text-primary] mb-4">Lessons</h2>
        <div className="flex flex-col gap-3">
          {courseLessons.map((lesson, i) => (
            <div key={lesson.id} className="rounded-xl border border-[--border] bg-[--bg-surface] p-4">
              <div className="flex items-start gap-3">
                <span className="text-[13px] font-mono text-[--text-secondary] mt-0.5 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[--text-primary] leading-snug">
                    {lesson.videoTitle ?? lesson.topic}
                  </p>
                  {!lesson.youtubeVideoId && (
                    <span className="inline-block mt-1 text-[12px] px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 bg-amber-50">No video</span>
                  )}
                  <LessonActions lessonId={lesson.id} lessonTopic={lesson.topic} hasVideo={!!lesson.youtubeVideoId} />
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
                            <span className="shrink-0 text-[12px] px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 bg-amber-50">{q.flagCount} flag{q.flagCount !== 1 ? "s" : ""}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
