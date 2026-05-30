"use server"

import { db } from "@/lib/db"
import { questions, userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, asc, eq } from "drizzle-orm"

export async function submitQuiz(
  lessonId: string,
  answers: number[]
): Promise<{ passed: boolean; score: number; correctAnswers: number[] }> {
  let session: { userId: string }
  try {
    session = await verifySession()
  } catch {
    return { passed: false, score: 0, correctAnswers: [] }
  }

  const qs = await db.query.questions.findMany({
    where: eq(questions.lessonId, lessonId),
    orderBy: [asc(questions.position)],
  })

  if (!qs.length) return { passed: false, score: 0, correctAnswers: [] }

  const correct = qs.filter((q, i) => answers[i] === q.correctIndex).length
  const score = Math.round((correct / qs.length) * 100)
  const passed = score >= 70

  if (passed) {
    await db
      .update(userProgress)
      .set({ passedQuiz: true, completedAt: new Date() })
      .where(and(eq(userProgress.userId, session.userId), eq(userProgress.lessonId, lessonId)))
  }

  return { passed, score, correctAnswers: qs.map((q) => q.correctIndex) }
}
