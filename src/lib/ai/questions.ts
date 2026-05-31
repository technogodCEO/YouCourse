import "server-only"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
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

  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt: `Generate exactly 5 comprehension questions for a video lesson about the following topic. Each question must have exactly 4 answer options and one correct answer (0-indexed). Return a JSON object with a single key "questions" containing an array of objects, each with "question_text" (string), "options" (array of 4 strings), and "correct_index" (integer 0-3). Topic: ${lessonTopic}\n\n${context}`,
  })
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Failed to parse questions from AI response")
  const parsed = QuestionsSchema.safeParse(JSON.parse(match[0]))
  if (!parsed.success) throw new Error("Invalid questions structure from AI response")
  return parsed.data.questions.slice(0, 5) as Question[]
}
