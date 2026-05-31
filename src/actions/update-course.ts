"use server"

import { db } from "@/lib/db"
import { courses } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { eq } from "drizzle-orm"

export async function updateCourse(
  courseId: string,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession()

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) return { error: "Not found" }
  if (course.creatorId !== session.userId) return { error: "Forbidden" }

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const visibilityRaw = formData.get("visibility") as string
  if (visibilityRaw !== "public" && visibilityRaw !== "private") {
    return { error: "Invalid visibility value" }
  }
  const visibility = visibilityRaw as "public" | "private"

  if (!title) return { error: "Title is required" }
  if (title.length > 200) return { error: "Title must be 200 characters or less" }

  await db.update(courses).set({ title, description, visibility }).where(eq(courses.id, courseId))
  return { success: true }
}
