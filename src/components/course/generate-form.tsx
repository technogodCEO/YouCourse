"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { generateCourse } from "@/actions/generate-course"

const presets = [
  { value: "quick", label: "Quick", description: "3 lessons" },
  { value: "standard", label: "Standard", description: "6 lessons" },
  { value: "long", label: "Long", description: "10 lessons" },
] as const

export function GenerateForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<"quick" | "standard" | "long">("standard")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("lengthPreset", preset)
    const result = await generateCourse(formData)
    if ("error" in result) {
      setError(result.error)
      setIsPending(false)
    } else {
      router.push(`/courses/${result.courseId}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="topic" className="text-[14px] font-medium text-[--text-primary]">
          What do you want to learn?
        </label>
        <input
          id="topic"
          name="topic"
          type="text"
          required
          placeholder="e.g. JavaScript async/await, Python for beginners"
          disabled={isPending}
          className="w-full min-h-[44px] px-4 py-3 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] placeholder:text-[--text-secondary] text-[16px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-medium text-[--text-primary]">Course length</span>
        <div className="grid grid-cols-3 gap-3">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={isPending}
              onClick={() => setPreset(p.value)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[64px] rounded-lg border text-[14px] font-medium transition-colors disabled:opacity-50 ${
                preset === p.value
                  ? "border-[#F05A2A] bg-[#F05A2A]/10 text-[#F05A2A]"
                  : "border-[--border] bg-[--bg-surface] text-[--text-primary] hover:border-[#F05A2A]/50"
              }`}
            >
              <span>{p.label}</span>
              <span className="text-[12px] font-normal opacity-70">{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[14px] text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Generating your course…" : "Generate Course"}
      </button>
    </form>
  )
}
