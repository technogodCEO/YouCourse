"use server"

import { db } from "@/lib/db"
import { lessons, userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, eq } from "drizzle-orm"

export async function skipLesson(lessonId: string): Promise<void> {
  const session = await verifySession()

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson || lesson.youtubeVideoId !== null) return

  await db
    .update(userProgress)
    .set({ passedQuiz: true, completedAt: new Date() })
    .where(and(eq(userProgress.userId, session.userId), eq(userProgress.lessonId, lessonId)))
}
