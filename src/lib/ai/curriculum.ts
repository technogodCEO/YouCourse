import "server-only"
import { groq } from "@ai-sdk/groq"
import { generateObject } from "ai"
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
  const { object } = await generateObject({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    schema: CurriculumSchema,
    prompt: `Generate exactly ${lessonCount} ordered lesson topics for a YouTube course about the following topic. Each topic should be a concise search query (5-10 words) that will find a good tutorial video. Topic: ${topic}`,
  })
  return object.lessons.slice(0, lessonCount)
}
