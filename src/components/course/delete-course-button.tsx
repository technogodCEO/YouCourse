"use client"

import { deleteCourse } from "@/actions/delete-course"

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  async function handleDelete() {
    if (!confirm("Delete this course? This cannot be undone.")) return
    await deleteCourse(courseId)
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex items-center min-h-[36px] px-4 py-2 rounded-lg border border-red-300 text-[14px] font-medium text-red-600 hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  )
}
