"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { VideoPlayer } from "@/components/learn/video-player"
import { Quiz } from "@/components/learn/quiz"

type QuestionData = { id: string; questionText: string; options: string[] }

type Props = {
  courseId: string
  lessonId: string
  videoId: string
  questions: QuestionData[]
  alreadyPassed: boolean
}

export function LessonPlayer({ courseId, lessonId, videoId, questions, alreadyPassed }: Props) {
  const router = useRouter()
  const [showQuiz, setShowQuiz] = useState(alreadyPassed)

  return (
    <div className="flex flex-col gap-8">
      <VideoPlayer videoId={videoId} onVideoComplete={() => setShowQuiz(true)} />

      {!showQuiz && (
        <p className="text-[14px] text-[--text-secondary] text-center">
          Complete the video to unlock the quiz.
        </p>
      )}

      {showQuiz && questions.length > 0 && (
        <Quiz
          lessonId={lessonId}
          questions={questions}
          onPassed={() => router.push(`/learn/${courseId}`)}
        />
      )}

      {showQuiz && questions.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-[15px] text-amber-800">No quiz available for this lesson — transcript was unavailable during generation.</p>
          <button
            type="button"
            onClick={() => router.push(`/learn/${courseId}`)}
            className="mt-3 inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[14px] font-semibold"
          >
            Continue to Next Lesson
          </button>
        </div>
      )}
    </div>
  )
}
