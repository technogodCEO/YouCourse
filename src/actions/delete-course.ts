"use server"

import { db } from "@/lib/db"
import { courses } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

export async function deleteCourse(courseId: string): Promise<void> {
  const session = await verifySession()
  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course || course.creatorId !== session.userId) return
  await db.delete(courses).where(eq(courses.id, courseId))
  redirect("/dashboard")
}
