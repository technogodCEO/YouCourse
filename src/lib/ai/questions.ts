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
  ),
})

export async function generateQuestions(
  transcript: string | null,
  lessonTopic: string,
  videoTitle?: string
): Promise<Question[]> {
  const context = transcript
    ? `Base questions strictly on this transcript:\n${transcript.slice(0, 6000)}`
    : `No transcript is available. Generate questions based on what a viewer would typically learn from a video about the topic: ${lessonTopic}${videoTitle ? ` (video title: ${videoTitle})` : ""}.`

  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: QuestionsSchema,
    prompt: `Generate exactly 5 comprehension questions for a video lesson about the following topic. Each question must have exactly 4 answer options and one correct answer (0-indexed). Topic: ${lessonTopic}\n\n${context}`,
  })
  return object.questions.slice(0, 5) as Question[]
}
