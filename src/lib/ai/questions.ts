import "server-only"
import { groq } from "@ai-sdk/groq"
import { generateObject } from "ai"
import { z } from "zod"

export type Question = {
  question_text: string
  options: [string, string, string, string]
  correct_index: number
}

const QuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question_text: z.string().min(1),
      options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
      correct_index: z.number().int().min(0).max(3),
    })
  ).max(15),
})

export async function generateQuestions(
  transcript: string | null,
  lessonTopic: string,
  videoTitle?: string,
  videoDurationSeconds?: number | null,
): Promise<Question[]> {
  const durationHint = videoDurationSeconds
    ? `Video duration: ${Math.round(videoDurationSeconds / 60)} minutes.`
    : ""

  const context = transcript
    ? `Base questions strictly on this transcript:\n${transcript.slice(0, 6000)}`
    : `No transcript is available. Generate questions based on what a viewer would typically learn from a video about the topic: ${lessonTopic}${videoTitle ? ` (video title: ${videoTitle})` : ""}.`

  const { object } = await generateObject({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    schema: QuestionsSchema,
    prompt: `Generate comprehension questions for a video lesson.

Topic: ${lessonTopic}
${durationHint}

Decide how many questions to write based on the content density and duration. A dense 15-minute video essay may warrant as many questions as a 3-hour podcast with low information density. A short focused clip may only need 3. A rich, information-dense lesson may warrant up to 10-12. Use your judgment — do not pad with trivial questions.

Each question must have exactly 4 answer options and one correct answer (0-indexed). Distractors should be plausible, not obviously wrong.

${context}`,
  })
  return object.questions as Question[]
}
