"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { VideoPlayer } from "@/components/learn/video-player"
import { Quiz } from "@/components/learn/quiz"
import { generateQuestionSet } from "@/actions/generate-question-set"

type QuestionData = { id: string; questionText: string; options: string[] }
type QuestionSet = { setIndex: number; questions: QuestionData[] }

type Props = {
  courseId: string
  lessonId: string
  videoId: string
  questionSets: QuestionSet[]
  flaggedQuestionIds: string[]
  alreadyPassed: boolean
  hasTranscript: boolean
}

export function LessonPlayer({ courseId, lessonId, videoId, questionSets, flaggedQuestionIds, alreadyPassed, hasTranscript }: Props) {
  const router = useRouter()
  const [showQuiz, setShowQuiz] = useState(alreadyPassed)
  const [passed, setPassed] = useState(alreadyPassed)
  const [courseCompleted, setCourseCompleted] = useState(false)
  const [sets, setSets] = useState<QuestionSet[]>(questionSets)
  const [activeSetIndex, setActiveSetIndex] = useState(
    questionSets.length > 0 ? questionSets[questionSets.length - 1].setIndex : 0
  )
  const [moreQuestionsError, setMoreQuestionsError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeSet = sets.find((s) => s.setIndex === activeSetIndex) ?? sets[sets.length - 1]

  function handlePassed(completed: boolean) {
    setPassed(true)
    setCourseCompleted(completed)
  }

  function handleMoreQuestions() {
    setMoreQuestionsError(null)
    startTransition(async () => {
      const result = await generateQuestionSet(lessonId)
      if ("error" in result) {
        setMoreQuestionsError(result.error === "noTranscript"
          ? "More questions require a video transcript, which isn't available for this lesson."
          : result.error)
        return
      }
      router.refresh()
      setActiveSetIndex(result.setIndex)
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <VideoPlayer videoId={videoId} onVideoComplete={() => setShowQuiz(true)} />
      {!showQuiz && (
        <p className="text-[14px] text-[--text-secondary] text-center">Complete the video to unlock the quiz.</p>
      )}
      {showQuiz && sets.length > 0 && (
        <div className="flex flex-col gap-6">
          {sets.length > 1 && (
            <div className="flex items-center gap-3">
              <label htmlFor="set-select" className="text-[14px] text-[--text-secondary]">Question set:</label>
              <select
                id="set-select"
                value={activeSetIndex}
                onChange={(e) => setActiveSetIndex(Number(e.target.value))}
                className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50"
              >
                {sets.map((s) => (
                  <option key={s.setIndex} value={s.setIndex}>
                    {s.setIndex === 0 ? "Set 1 — Original" : `Set ${s.setIndex + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeSet && (
            <Quiz lessonId={lessonId} setIndex={activeSet.setIndex} questions={activeSet.questions} flaggedQuestionIds={flaggedQuestionIds} onPassed={handlePassed} />
          )}
          {passed && (
            <div className="flex flex-col gap-3">
              {courseCompleted ? (
                <button type="button" onClick={() => router.push(`/learn/${courseId}/complete`)} className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity">
                  View Completion Certificate →
                </button>
              ) : (
                <button type="button" onClick={() => router.push(`/learn/${courseId}`)} className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity">
                  Next Lesson →
                </button>
              )}
              <button type="button" disabled={isPending} onClick={handleMoreQuestions} className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg border border-[--border] text-[15px] font-medium text-[--text-primary] hover:bg-[--bg-surface] disabled:opacity-50 transition-colors">
                {isPending ? "Generating…" : "I want more questions"}
              </button>
              {moreQuestionsError && (
                <p className="text-[14px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{moreQuestionsError}</p>
              )}
            </div>
          )}
        </div>
      )}
      {showQuiz && sets.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-[15px] text-amber-800">No quiz available for this lesson — transcript was unavailable during generation.</p>
          <button type="button" onClick={() => router.push(`/learn/${courseId}`)} className="mt-3 inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[14px] font-semibold">
            Continue to Next Lesson
          </button>
        </div>
      )}
    </div>
  )
}
