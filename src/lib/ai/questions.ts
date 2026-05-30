import "server-only"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

export type Question = {
  question_text: string
  options: [string, string, string, string]
  correct_index: number
}

export async function generateQuestions(transcript: string, lessonTopic: string): Promise<Question[]> {
  const trimmed = transcript.slice(0, 6000)
  const { text } = await generateText({
    model: groq("llama-3.3-70b-versatile"),
    prompt: `Generate exactly 5 comprehension questions for a video lesson about "${lessonTopic}". Base questions strictly on the transcript below. Return ONLY a valid JSON array with no other text, markdown, or explanation. Each item must have: "question_text" (string), "options" (array of exactly 4 strings), "correct_index" (integer 0-3). Example format: [{"question_text":"Q?","options":["A","B","C","D"],"correct_index":0}]\n\nTranscript: ${trimmed}`,
  })
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error("Failed to parse questions from AI response")
  return JSON.parse(match[0]).slice(0, 5)
}
