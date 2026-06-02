"use client"

import { useState } from "react"
import { swapVideo } from "@/actions/swap-video"
import { retryQuestions } from "@/actions/retry-questions"
import { deleteLesson } from "@/actions/delete-lesson"
import { useRouter } from "next/navigation"

type Props = {
  lessonId: string
  lessonTopic: string
  hasVideo: boolean
  transcriptAvailable: boolean
}

export function LessonActions({ lessonId, lessonTopic, hasVideo, transcriptAvailable }: Props) {
  const router = useRouter()
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapQuery, setSwapQuery] = useState(lessonTopic)
  const [loading, setLoading] = useState<"swap" | "retry" | "delete" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault()
    setLoading("swap")
    setError(null)
    const result = await swapVideo(lessonId, swapQuery)
    setLoading(null)
    if ("error" in result) { setError(result.error); return }
    setSwapOpen(false)
    router.refresh()
  }

  async function handleRetry() {
    setLoading("retry")
    setError(null)
    const result = await retryQuestions(lessonId)
    setLoading(null)
    if ("error" in result) { setError(result.error); return }
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm("Delete this lesson? This cannot be undone.")) return
    setLoading("delete")
    setError(null)
    const result = await deleteLesson(lessonId)
    setLoading(null)
    if ("error" in result) { setError(result.error); return }
    router.refresh()
  }

  return (
    <div className="mt-2">
      {error && <p className="text-[13px] text-red-500 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => setSwapOpen((o) => !o)}
          className="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-md border border-[--border] text-[13px] font-medium text-[--text-primary] hover:bg-[--bg-surface] disabled:opacity-50 transition-colors"
        >
          {loading === "swap" ? "Swapping…" : "Swap Video"}
        </button>
        {hasVideo && !transcriptAvailable && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={handleRetry}
            className="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-md border border-[--border] text-[13px] font-medium text-[--text-primary] hover:bg-[--bg-surface] disabled:opacity-50 transition-colors"
          >
            {loading === "retry" ? "Retrying…" : "Retry Questions"}
          </button>
        )}
        <button
          type="button"
          disabled={loading !== null}
          onClick={handleDelete}
          className="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-md border border-red-200 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>
      {swapOpen && (
        <form onSubmit={handleSwap} className="mt-3 flex gap-2">
          <input
            type="text"
            value={swapQuery}
            onChange={(e) => setSwapQuery(e.target.value)}
            disabled={loading === "swap"}
            placeholder="Search query for replacement video"
            className="flex-1 min-h-[36px] px-3 py-2 rounded-md border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading === "swap" || !swapQuery.trim()}
            className="inline-flex items-center min-h-[36px] px-4 py-2 rounded-md bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[14px] font-semibold disabled:opacity-50"
          >
            {loading === "swap" ? "…" : "Swap"}
          </button>
        </form>
      )}
    </div>
  )
}
