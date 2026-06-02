"use client"

import { useState } from "react"
import { submitQuiz } from "@/actions/submit-quiz"
import { flagQuestion } from "@/actions/flag-question"

type QuestionData = { id: string; questionText: string; options: string[] }

type Props = {
  lessonId: string
  setIndex: number
  questions: QuestionData[]
  flaggedQuestionIds: string[]
  onPassed: (courseCompleted: boolean) => void
}

export function Quiz({ lessonId, setIndex, questions, flaggedQuestionIds, onPassed }: Props) {
  const [selected, setSelected] = useState<(number | null)[]>(questions.map(() => null))
  const [result, setResult] = useState<{ passed: boolean; score: number; wrongIndexes?: number[]; courseCompleted?: boolean } | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [flagged, setFlagged] = useState<Set<string>>(new Set(flaggedQuestionIds))

  const allAnswered = selected.every((s) => s !== null)

  async function handleSubmit() {
    if (!allAnswered) return
    setIsPending(true)
    const res = await submitQuiz(lessonId, selected as number[], setIndex)
    setResult(res)
    setIsPending(false)
    if (res.passed) setTimeout(() => onPassed(res.courseCompleted ?? false), 1500)
  }

  function handleRetry() {
    setSelected(questions.map(() => null))
    setResult(null)
  }

  async function handleFlag(questionId: string) {
    const res = await flagQuestion(questionId)
    if ("error" in res) return
    setFlagged((prev) => {
      const next = new Set(prev)
      if (res.flagged) next.add(questionId)
      else next.delete(questionId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[20px] font-semibold text-[--text-primary]">
        Comprehension Quiz{setIndex > 0 ? ` — Set ${setIndex + 1}` : ""}
      </h2>
      <p className="text-[13px] text-[--text-secondary] -mt-4">Questions are based on general best practices for this topic and may not reflect the specific approach taken in the video.</p>
      {questions.map((q, qi) => (
        <div key={q.id} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-medium text-[--text-primary]">{qi + 1}. {q.questionText}</p>
            <button
              type="button"
              onClick={() => handleFlag(q.id)}
              title={flagged.has(q.id) ? "Remove flag" : "Flag this question"}
              className={`shrink-0 mt-0.5 text-[13px] px-2 py-0.5 rounded border transition-colors ${flagged.has(q.id) ? "border-amber-400 text-amber-700 bg-amber-50" : "border-[--border] text-[--text-secondary] hover:border-amber-400 hover:text-amber-600"}`}
            >
              {flagged.has(q.id) ? "⚑ Flagged" : "⚐ Flag"}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => {
              const isSelected = selected[qi] === oi
              const isWrong = result && !result.passed && result.wrongIndexes?.includes(qi) && isSelected
              const isCorrect = result && !result.passed && isSelected && !isWrong
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={!!result || isPending}
                  onClick={() => setSelected((prev) => { const next = [...prev]; next[qi] = oi; return next })}
                  className={`text-left px-4 py-3 rounded-lg border text-[14px] transition-colors disabled:cursor-default ${isCorrect ? "border-green-500 bg-green-50 text-green-800" : isWrong ? "border-red-400 bg-red-50 text-red-800" : isSelected ? "border-[#F05A2A] bg-[#F05A2A]/10 text-[#F05A2A]" : "border-[--border] bg-[--bg-surface] text-[--text-primary] hover:border-[#F05A2A]/50"}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {!result && (
        <button type="button" disabled={!allAnswered || isPending} onClick={handleSubmit} className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
          {isPending ? "Checking…" : "Submit Quiz"}
        </button>
      )}
      {result && (
        <div className={`rounded-xl border p-5 ${result.passed ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50"}`}>
          {result.passed ? (
            <p className="text-[16px] font-semibold text-green-800">{result.courseCompleted ? "Course complete! 🎉" : "You passed!"} ({result.score}%)</p>
          ) : (
            <>
              <p className="text-[16px] font-semibold text-red-800 mb-1">You did not pass ({result.score}%)</p>
              <p className="text-[14px] text-red-700 mb-4">Minimum passing score is 70%. Correct answers are highlighted above.</p>
              <button type="button" onClick={handleRetry} className="inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg border border-red-400 text-[14px] font-medium text-red-700 hover:bg-red-100 transition-colors">
                Retry Quiz
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
