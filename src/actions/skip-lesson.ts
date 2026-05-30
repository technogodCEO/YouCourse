"use server"

import { db } from "@/lib/db"
import { userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, eq } from "drizzle-orm"

export async function skipLesson(lessonId: string): Promise<void> {
  const session = await verifySession()
  await db
    .update(userProgress)
    .set({ passedQuiz: true, completedAt: new Date() })
    .where(and(eq(userProgress.userId, session.userId), eq(userProgress.lessonId, lessonId)))
}
