"use client"

import { useState } from "react"
import { submitQuiz } from "@/actions/submit-quiz"

type QuestionData = { id: string; questionText: string; options: string[] }

type Props = {
  lessonId: string
  questions: QuestionData[]
  onPassed: () => void
}

export function Quiz({ lessonId, questions, onPassed }: Props) {
  const [selected, setSelected] = useState<(number | null)[]>(questions.map(() => null))
  const [result, setResult] = useState<{ passed: boolean; score: number; correctAnswers: number[] } | null>(null)
  const [isPending, setIsPending] = useState(false)

  const allAnswered = selected.every((s) => s !== null)

  async function handleSubmit() {
    if (!allAnswered) return
    setIsPending(true)
    const res = await submitQuiz(lessonId, selected as number[])
    setResult(res)
    setIsPending(false)
    if (res.passed) {
      setTimeout(onPassed, 1500)
    }
  }

  function handleRetry() {
    setSelected(questions.map(() => null))
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[20px] font-semibold text-[--text-primary]">Comprehension Quiz</h2>

      {questions.map((q, qi) => (
        <div key={q.id} className="flex flex-col gap-3">
          <p className="text-[15px] font-medium text-[--text-primary]">{qi + 1}. {q.questionText}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => {
              const isSelected = selected[qi] === oi
              const isCorrect = result && result.correctAnswers[qi] === oi
              const isWrong = result && isSelected && !isCorrect

              return (
                <button
                  key={oi}
                  type="button"
                  disabled={!!result || isPending}
                  onClick={() => setSelected((prev) => { const next = [...prev]; next[qi] = oi; return next })}
                  className={`text-left px-4 py-3 rounded-lg border text-[14px] transition-colors disabled:cursor-default ${
                    isCorrect
                      ? "border-green-500 bg-green-50 text-green-800"
                      : isWrong
                      ? "border-red-400 bg-red-50 text-red-800"
                      : isSelected
                      ? "border-[#F05A2A] bg-[#F05A2A]/10 text-[#F05A2A]"
                      : "border-[--border] bg-[--bg-surface] text-[--text-primary] hover:border-[#F05A2A]/50"
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {!result && (
        <button
          type="button"
          disabled={!allAnswered || isPending}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Checking…" : "Submit Quiz"}
        </button>
      )}

      {result && (
        <div className={`rounded-xl border p-5 ${result.passed ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50"}`}>
          {result.passed ? (
            <p className="text-[16px] font-semibold text-green-800">You passed! ({result.score}%) — Unlocking next lesson…</p>
          ) : (
            <>
              <p className="text-[16px] font-semibold text-red-800 mb-1">You did not pass ({result.score}%)</p>
              <p className="text-[14px] text-red-700 mb-4">Minimum passing score is 70%. Correct answers are highlighted above.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg border border-red-400 text-[14px] font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                Retry Quiz
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
