import "server-only"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { z } from "zod"

const lessonCounts = { quick: 3, standard: 6, long: 10 } as const

const CurriculumSchema = z.object({
  lessons: z.array(z.string().min(1).max(200)),
})

export async function generateCurriculum(
  topic: string,
  lengthPreset: "quick" | "standard" | "long"
): Promise<string[]> {
  const lessonCount = lessonCounts[lengthPreset]
  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt: `Generate exactly ${lessonCount} ordered lesson topics for a YouTube course about the following topic. Each topic should be a concise search query (5-10 words) that will find a good tutorial video. Return a JSON object with a single key "lessons" containing an array of strings. Example: {"lessons":["Topic one","Topic two"]}. Topic: ${topic}`,
  })
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Failed to parse curriculum from AI response")
  const parsed = CurriculumSchema.safeParse(JSON.parse(match[0]))
  if (!parsed.success) throw new Error("Invalid curriculum structure from AI response")
  return parsed.data.lessons.slice(0, lessonCount)
}
