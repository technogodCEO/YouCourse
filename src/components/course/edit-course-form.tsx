"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateCourse } from "@/actions/update-course"

type Props = {
  courseId: string
  defaultTitle: string
  defaultDescription: string | null
  defaultVisibility: string
}

export function EditCourseForm({ courseId, defaultTitle, defaultDescription, defaultVisibility }: Props) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<"public" | "private">(
    defaultVisibility === "public" ? "public" : "private"
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("visibility", visibility)
    const result = await updateCourse(courseId, formData)
    if ("error" in result) {
      setError(result.error)
      setIsPending(false)
    } else {
      router.push(`/courses/${courseId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-[14px] font-medium text-[--text-primary]">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaultTitle}
          disabled={isPending}
          className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[16px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-[14px] font-medium text-[--text-primary]">Description <span className="text-[--text-secondary] font-normal">(optional)</span></label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultDescription ?? ""}
          disabled={isPending}
          className="w-full px-4 py-3 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[16px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50 resize-none disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium text-[--text-primary]">Visibility</span>
        <div className="grid grid-cols-2 gap-3">
          {(["private", "public"] as const).map((v) => (
            <button
              key={v}
              type="button"
              disabled={isPending}
              onClick={() => setVisibility(v)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] rounded-lg border text-[14px] font-medium transition-colors disabled:opacity-50 ${
                visibility === v
                  ? "border-[#F05A2A] bg-[#F05A2A]/10 text-[#F05A2A]"
                  : "border-[--border] bg-[--bg-surface] text-[--text-primary] hover:border-[#F05A2A]/50"
              }`}
            >
              {v === "private" ? "Private" : "Public"}
              <span className="text-[12px] font-normal opacity-70">
                {v === "private" ? "Link only" : "Anyone can find it"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-[14px] text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.back()}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-3 rounded-lg border border-[--border] text-[15px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
