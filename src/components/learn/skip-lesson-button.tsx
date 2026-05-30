"use client"

import { useRouter } from "next/navigation"
import { skipLesson } from "@/actions/skip-lesson"

export function SkipLessonButton({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const router = useRouter()

  async function handleSkip() {
    await skipLesson(lessonId)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSkip}
      className="shrink-0 inline-flex items-center justify-center min-h-[36px] px-4 py-2 rounded-lg border border-amber-400/50 text-[14px] font-medium text-amber-700 hover:bg-amber-50 transition-colors"
    >
      Skip
    </button>
  )
}
