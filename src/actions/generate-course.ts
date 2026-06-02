"use server"

import { db } from "@/lib/db"
import { courses, lessons, questions } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { generateCurriculum } from "@/lib/ai/curriculum"
import { searchYouTubeVideo } from "@/lib/youtube/search"
import { generateQuestions } from "@/lib/ai/questions"
import { fetchTranscript } from "@/lib/youtube/transcript"
import { eq } from "drizzle-orm"

export async function generateCourse(
  formData: FormData
): Promise<{ courseId: string } | { error: string }> {
  let courseId: string | undefined

  try {
    const session = await verifySession()

    const topic = (formData.get("topic") as string)?.trim()
    const lengthPresetRaw = formData.get("lengthPreset") as string
    const validPresets = ["quick", "standard", "long"] as const
    if (!validPresets.includes(lengthPresetRaw as typeof validPresets[number])) {
      return { error: "Invalid length preset" }
    }
    const lengthPreset = lengthPresetRaw as "quick" | "standard" | "long"

    if (!topic) return { error: "Topic is required" }
    if (topic.length > 200) return { error: "Topic must be 200 characters or less" }

    const [newCourse] = await db
      .insert(courses)
      .values({
        creatorId: session.userId,
        title: topic,
        topic,
        lengthPreset,
        status: "generating",
        visibility: "private",
      })
      .returning({ id: courses.id })

    courseId = newCourse.id

    const lessonTopics = await generateCurriculum(topic, lengthPreset)

    const lessonRows: { id: string; topic: string }[] = []
    for (let i = 0; i < lessonTopics.length; i++) {
      const [row] = await db
        .insert(lessons)
        .values({ courseId, position: i, topic: lessonTopics[i] })
        .returning({ id: lessons.id })
      lessonRows.push({ id: row.id, topic: lessonTopics[i] })
    }

    await Promise.all(
      lessonRows.map(async ({ id: lessonId, topic: lessonTopic }) => {
        try {
          const video = await searchYouTubeVideo(lessonTopic)
          if (!video) return

          const transcriptText = await fetchTranscript(video.videoId)

          const qs = await generateQuestions(
            transcriptText,
            lessonTopic,
            video.title,
            video.durationSeconds
          )

          await db.update(lessons)
            .set({ youtubeVideoId: video.videoId, videoTitle: video.title, videoDuration: video.durationSeconds })
            .where(eq(lessons.id, lessonId))

          await db.insert(questions).values(
            qs.map((q, i) => ({
              lessonId,
              position: i,
              questionText: q.question_text,
              options: JSON.stringify(q.options),
              correctIndex: q.correct_index,
            }))
          )
        } catch {
          // Leave lesson with no video — creator can fix via swap
        }
      })
    )

    await db.update(courses).set({
      status: "ready",
      title: `${topic} — Generated Course`,
    }).where(eq(courses.id, courseId))

    return { courseId }
  } catch (err) {
    if (courseId) {
      await db.update(courses).set({ status: "error" }).where(eq(courses.id, courseId))
    }
    return { error: err instanceof Error ? err.message : "Generation failed" }
  }
}
