"use server"

import { db } from "@/lib/db"
import { lessons, questions, userProgress } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { fetchTranscript } from "@/lib/youtube/transcript"
import { generateQuestions } from "@/lib/ai/questions"
import { eq, and, max } from "drizzle-orm"

export async function generateQuestionSet(
  lessonId: string
): Promise<{ setIndex: number } | { error: string }> {
  const session = await verifySession()

  const progress = await db.query.userProgress.findFirst({
    where: and(
      eq(userProgress.userId, session.userId),
      eq(userProgress.lessonId, lessonId)
    ),
  })
  if (!progress?.passedQuiz) return { error: "Complete this lesson first" }

  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  })
  if (!lesson) return { error: "Lesson not found" }
  if (!lesson.youtubeVideoId) return { error: "noTranscript" }

  const transcriptText = await fetchTranscript(lesson.youtubeVideoId)
  if (!transcriptText) return { error: "noTranscript" }

  const existingQuestions = await db.query.questions.findMany({
    where: eq(questions.lessonId, lessonId),
  })

  const [{ maxSet }] = await db
    .select({ maxSet: max(questions.setIndex) })
    .from(questions)
    .where(eq(questions.lessonId, lessonId))

  const nextSetIndex = (maxSet ?? 0) + 1

  const existingTexts = existingQuestions.map((q) => q.questionText)
  const avoidClause = existingTexts.length
    ? `\n\nDo NOT repeat any of these questions:\n${existingTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : ""

  const newQuestions = await generateQuestions(
    transcriptText + avoidClause,
    lesson.topic,
    lesson.videoTitle ?? lesson.topic,
    lesson.videoDuration ?? 0
  )

  await db.insert(questions).values(
    newQuestions.map((q, i) => ({
      lessonId,
      position: i,
      setIndex: nextSetIndex,
      questionText: q.question_text,
      options: JSON.stringify(q.options),
      correctIndex: q.correct_index,
    }))
  )

  return { setIndex: nextSetIndex }
}
