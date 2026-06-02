"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { fetchTranscript } from "@/lib/youtube/transcript"
import { generateQuestions } from "@/lib/ai/questions"
import { eq } from "drizzle-orm"

export async function retryQuestions(
  lessonId: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession()

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  })
  if (!lesson) return { error: "Lesson not found" }
  if (!lesson.youtubeVideoId) return { error: "Lesson has no video — use Swap Video instead" }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course || course.creatorId !== session.userId) return { error: "Not authorised" }

  const transcriptText = await fetchTranscript(lesson.youtubeVideoId)

  const newQuestions = await generateQuestions(
    transcriptText,
    lesson.topic,
    lesson.videoTitle ?? lesson.topic,
    lesson.videoDuration ?? 0
  )

  await db.delete(questions).where(eq(questions.lessonId, lessonId))

  await db.insert(questions).values(
    newQuestions.map((q, i) => ({
      lessonId,
      position: i,
      questionText: q.question_text,
      options: JSON.stringify(q.options),
      correctIndex: q.correct_index,
    }))
  )

  return { success: true }
}
