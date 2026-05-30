import "server-only"
import { YoutubeTranscript } from "youtube-transcript"

export async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId)
    if (!items?.length) return null
    return items.map((item) => item.text).join(" ")
  } catch {
    return null
  }
}
