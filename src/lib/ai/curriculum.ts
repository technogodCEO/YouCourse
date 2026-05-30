import "server-only"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

const lessonCounts = { quick: 3, standard: 6, long: 10 } as const

export async function generateCurriculum(
  topic: string,
  lengthPreset: "quick" | "standard" | "long"
): Promise<string[]> {
  const lessonCount = lessonCounts[lengthPreset]
  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt: `Generate exactly ${lessonCount} ordered lesson topics for a YouTube course about "${topic}". Each topic should be a concise search query (5-10 words) that will find a good tutorial video. Return ONLY a valid JSON array of strings with no other text, markdown, or explanation. Example format: ["Topic one", "Topic two"]`,
  })
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("Failed to parse curriculum from AI response")
  return JSON.parse(match[0]).slice(0, lessonCount)
}
