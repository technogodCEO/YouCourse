"use server"

import { db } from "@/lib/db"
import { courses, lessons, userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { eq, and, gt } from "drizzle-orm"

export async function deleteLesson(
  lessonId: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession()

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { error: "Lesson not found" }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course || course.creatorId !== session.userId) return { error: "Not authorised" }

  const deletedPosition = lesson.position
  const courseId = lesson.courseId

  await db.delete(userProgress).where(eq(userProgress.lessonId, lessonId))
  await db.delete(lessons).where(eq(lessons.id, lessonId))

  const remaining = await db.query.lessons.findMany({
    where: and(eq(lessons.courseId, courseId), gt(lessons.position, deletedPosition)),
    orderBy: (l, { asc }) => [asc(l.position)],
  })

  for (const l of remaining) {
    await db.update(lessons)
      .set({ position: l.position - 1 })
      .where(eq(lessons.id, l.id))
  }

  return { success: true }
}
