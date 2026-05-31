"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions, userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, asc, eq } from "drizzle-orm"

export async function submitQuiz(
  lessonId: string,
  answers: number[]
): Promise<{ passed: boolean; score: number; wrongIndexes?: number[] }> {
  let session: { userId: string }
  try {
    session = await verifySession()
  } catch {
    return { passed: false, score: 0 }
  }

  // Verify the lesson exists and belongs to an accessible course
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { passed: false, score: 0 }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course) return { passed: false, score: 0 }
  if (course.visibility !== "public" && course.creatorId !== session.userId) {
    return { passed: false, score: 0 }
  }

  const qs = await db.query.questions.findMany({
    where: eq(questions.lessonId, lessonId),
    orderBy: [asc(questions.position)],
  })

  if (!qs.length) return { passed: false, score: 0 }

  const wrongIndexes = qs
    .map((q, i) => (answers[i] !== q.correctIndex ? i : -1))
    .filter((i) => i !== -1)
  const correct = qs.length - wrongIndexes.length
  const score = Math.round((correct / qs.length) * 100)
  const passed = score >= 70

  if (passed) {
    await db
      .update(userProgress)
      .set({ passedQuiz: true, completedAt: new Date() })
      .where(and(eq(userProgress.userId, session.userId), eq(userProgress.lessonId, lessonId)))
    return { passed, score }
  }

  return { passed, score, wrongIndexes }
}
