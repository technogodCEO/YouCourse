import "server-only"
import { groq } from "@ai-sdk/groq"
import { generateObject } from "ai"
import { z } from "zod"

const presetIntent = {
  quick: "a concise overview — cover only the essential concepts a beginner needs",
  standard: "balanced coverage — cover the core concepts with enough depth to be practical",
  long: "comprehensive treatment — cover the topic thoroughly, including nuance, edge cases, and advanced concepts",
} as const

const CurriculumSchema = z.object({
  lessons: z.array(z.string().min(1).max(200)),
})

export async function generateCurriculum(
  topic: string,
  lengthPreset: "quick" | "standard" | "long"
): Promise<string[]> {
  const { object } = await generateObject({
    model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    schema: CurriculumSchema,
    prompt: `You are designing a YouTube-based learning course about: "${topic}".

Decide how many lessons this topic genuinely warrants for the requested depth. A short topic like "intro to git" might need 3 lessons even at long depth. A deep topic like "computer architecture" might need 15+ at long depth. Use your judgment.

Requested depth: ${presetIntent[lengthPreset]}

Return an ordered list of lesson topics. Each topic must be a concise search query (5-10 words) that will reliably find a good YouTube tutorial video on that specific subtopic.`,
  })
  return object.lessons
}
