"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions, userProgress, courseCompletions } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, asc, eq } from "drizzle-orm"

export async function submitQuiz(
  lessonId: string,
  answers: number[],
  setIndex: number = 0
): Promise<{ passed: boolean; score: number; wrongIndexes?: number[]; courseCompleted?: boolean }> {
  let session: { userId: string }
  try {
    session = await verifySession()
  } catch {
    return { passed: false, score: 0 }
  }

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { passed: false, score: 0 }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course) return { passed: false, score: 0 }
  if (course.visibility !== "public" && course.creatorId !== session.userId) {
    return { passed: false, score: 0 }
  }

  const qs = await db.query.questions.findMany({
    where: and(eq(questions.lessonId, lessonId), eq(questions.setIndex, setIndex)),
    orderBy: [asc(questions.position)],
  })

  if (!qs.length) return { passed: false, score: 0 }

  const wrongIndexes = qs
    .map((q, i) => (answers[i] !== q.correctIndex ? i : -1))
    .filter((i) => i !== -1)
  const correct = qs.length - wrongIndexes.length
  const score = Math.round((correct / qs.length) * 100)
  const passed = score >= 70

  if (!passed) return { passed, score, wrongIndexes }

  await db
    .update(userProgress)
    .set({ passedQuiz: true, completedAt: new Date() })
    .where(and(eq(userProgress.userId, session.userId), eq(userProgress.lessonId, lessonId)))

  const allLessons = await db.query.lessons.findMany({
    where: eq(lessons.courseId, lesson.courseId),
  })
  const allProgress = await db.query.userProgress.findMany({
    where: and(
      eq(userProgress.userId, session.userId),
      eq(userProgress.courseId, lesson.courseId)
    ),
  })
  const passedLessonIds = new Set(
    allProgress.filter((p) => p.passedQuiz).map((p) => p.lessonId)
  )
  passedLessonIds.add(lessonId)

  const allPassed = allLessons.every((l) => !l.youtubeVideoId || passedLessonIds.has(l.id))

  if (allPassed) {
    await db.insert(courseCompletions).values({
      userId: session.userId,
      courseId: lesson.courseId,
    }).onConflictDoNothing()
    return { passed, score, courseCompleted: true }
  }

  return { passed, score }
}
