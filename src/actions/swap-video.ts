"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions, videoCache } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { searchYouTubeVideo } from "@/lib/youtube/search"
import { fetchTranscript } from "@/lib/youtube/transcript"
import { generateQuestions } from "@/lib/ai/questions"
import { eq } from "drizzle-orm"

export async function swapVideo(
  lessonId: string,
  searchQuery: string
): Promise<{ success: true } | { error: string }> {
  const session = await verifySession()

  if (!searchQuery.trim()) return { error: "Search query is required" }

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) return { error: "Lesson not found" }

  const course = await db.query.courses.findFirst({ where: eq(courses.id, lesson.courseId) })
  if (!course || course.creatorId !== session.userId) return { error: "Not authorised" }

  const video = await searchYouTubeVideo(searchQuery.trim())
  if (!video) return { error: "No YouTube video found for that query" }

  const cached = await db.query.videoCache.findFirst({
    where: eq(videoCache.youtubeVideoId, video.videoId),
  })

  if (!cached) {
    const transcriptText = await fetchTranscript(video.videoId)
    await db.insert(videoCache).values({
      youtubeVideoId: video.videoId,
      title: video.title,
      durationSeconds: video.durationSeconds,
      transcriptText,
      transcriptStatus: transcriptText ? "available" : "unavailable",
    }).onConflictDoNothing()
  }

  const cacheRow = cached ?? await db.query.videoCache.findFirst({
    where: eq(videoCache.youtubeVideoId, video.videoId),
  })

  if (!cacheRow) return { error: "Failed to cache video" }

  const newQuestions = await generateQuestions(
    cacheRow.transcriptText,
    lesson.topic,
    cacheRow.title,
    cacheRow.durationSeconds
  )

  await db.delete(questions).where(eq(questions.lessonId, lessonId))

  await db.update(lessons)
    .set({ youtubeVideoId: video.videoId })
    .where(eq(lessons.id, lessonId))

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
