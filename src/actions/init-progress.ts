"use server"

import { db } from "@/lib/db"
import { lessons, userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { eq } from "drizzle-orm"

export async function initProgress(courseId: string): Promise<void> {
  let session: { userId: string }
  try {
    session = await verifySession()
  } catch {
    return
  }

  const courseLessons = await db.query.lessons.findMany({ where: eq(lessons.courseId, courseId) })

  if (!courseLessons.length) return

  await db
    .insert(userProgress)
    .values(
      courseLessons.map((l) => ({
        userId: session.userId,
        courseId,
        lessonId: l.id,
        passedQuiz: false,
      }))
    )
    .onConflictDoNothing()
}
