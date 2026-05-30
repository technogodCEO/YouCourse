import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { courses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifySession } from "@/lib/dal"
import { EditCourseForm } from "@/components/course/edit-course-form"

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const session = await verifySession()

  const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
  if (!course) notFound()
  if (course.creatorId !== session.userId) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[520px]">
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-8">Edit Course</h1>
        <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm">
          <EditCourseForm
            courseId={courseId}
            defaultTitle={course.title}
            defaultDescription={course.description ?? null}
            defaultVisibility={course.visibility}
          />
        </div>
      </div>
    </div>
  )
}
