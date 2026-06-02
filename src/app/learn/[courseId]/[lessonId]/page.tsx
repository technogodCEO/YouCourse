import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { courses, lessons, questions, userProgress, questionFlags } from "@/lib/db/schema"
import { eq, asc, and } from "drizzle-orm"
import { verifySession } from "@/lib/dal"
import { LessonPlayer } from "@/components/learn/lesson-player"

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params
  const session = await verifySession()

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) notFound()

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: { videoCache: true },
  })
  if (!lesson || lesson.courseId !== courseId) notFound()
  if (!lesson.youtubeVideoId) redirect(`/learn/${courseId}`)

  const allLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, courseId),
    orderBy: [asc(lessons.position)],
  })

  const priorLessons = allLessons.filter((l) => l.position < lesson.position)
  if (priorLessons.length > 0) {
    const progressRows = await db.query.userProgress.findMany({
      where: and(eq(userProgress.userId, session.userId), eq(userProgress.courseId, courseId)),
    })
    const passedSet = new Set(progressRows.filter((p) => p.passedQuiz).map((p) => p.lessonId))
    if (!priorLessons.every((l) => passedSet.has(l.id))) redirect(`/learn/${courseId}`)
  }

  const allQuestions = await db.query.questions.findMany({
    where: eq(questions.lessonId, lessonId),
    orderBy: [asc(questions.position)],
  })

  const setMap = new Map<number, typeof allQuestions>()
  for (const q of allQuestions) {
    if (!setMap.has(q.setIndex)) setMap.set(q.setIndex, [])
    setMap.get(q.setIndex)!.push(q)
  }
  const questionSets = Array.from(setMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([setIndex, qs]) => ({
      setIndex,
      questions: qs.flatMap((q) => {
        try {
          const opts = JSON.parse(q.options)
          if (!Array.isArray(opts) || opts.length !== 4 || !opts.every((o) => typeof o === "string")) return []
          return [{ id: q.id, questionText: q.questionText, options: opts as string[] }]
        } catch { return [] }
      }),
    }))

  const questionIds = allQuestions.map((q) => q.id)
  const userFlags = questionIds.length
    ? await db.query.questionFlags.findMany({
        where: (f, { and, eq, inArray }) => and(eq(f.userId, session.userId), inArray(f.questionId, questionIds)),
      })
    : []
  const flaggedQuestionIds = userFlags.map((f) => f.questionId)

  const progressRow = await db.query.userProgress.findFirst({
    where: and(eq(userProgress.userId, session.userId), eq(userProgress.lessonId, lessonId)),
  })
  const alreadyPassed = progressRow?.passedQuiz ?? false

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
        <Link href={`/learn/${courseId}`} className="text-[14px] text-[--text-secondary] hover:text-[--text-primary] mb-6 inline-block">
          ← Back to course
        </Link>
        <div className="mb-2">
          <span className="text-[13px] text-[--text-secondary]">Lesson {lesson.position + 1}</span>
          <h1 className="text-[22px] font-semibold text-[--text-primary] leading-snug mt-0.5">
            {lesson.videoCache?.title ?? lesson.topic}
          </h1>
        </div>
        {alreadyPassed && (
          <div className="mb-4 px-4 py-2 rounded-lg border border-green-500/30 bg-green-50 text-[14px] text-green-700">
            You already passed this lesson. You can review the video and quiz below.
          </div>
        )}
        <div className="mt-6">
          <LessonPlayer
            courseId={courseId}
            lessonId={lessonId}
            videoId={lesson.youtubeVideoId}
            questionSets={questionSets}
            flaggedQuestionIds={flaggedQuestionIds}
            alreadyPassed={alreadyPassed}
            hasTranscript={lesson.videoCache?.transcriptStatus === "available"}
          />
        </div>
      </div>
    </div>
  )
}
