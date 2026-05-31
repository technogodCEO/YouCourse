import { verifySession } from "@/lib/dal"
import { GenerateForm } from "@/components/course/generate-form"

export const maxDuration = 300

export default async function GeneratePage() {
  await verifySession()

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[520px]">
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-2">
          Create a New Course
        </h1>
        <p className="text-[16px] text-[--text-secondary] mb-8">
          Enter a topic and we&apos;ll build a full course with videos and comprehension questions.
        </p>
        <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm">
          <GenerateForm />
        </div>
      </div>
    </div>
  )
}
