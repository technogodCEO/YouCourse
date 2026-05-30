import "server-only"

export type VideoResult = { videoId: string; title: string; durationSeconds: number }

function parseIso8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] ?? "0")
  const minutes = parseInt(match[2] ?? "0")
  const seconds = parseInt(match[3] ?? "0")
  return hours * 3600 + minutes * 60 + seconds
}

export async function searchYouTubeVideo(topic: string): Promise<VideoResult | null> {
  const key = process.env.YOUTUBE_API_KEY
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCaption=closedCaption&maxResults=1&q=${encodeURIComponent(topic)}&key=${key}`
  const searchRes = await fetch(searchUrl)
  const searchData = await searchRes.json()

  if (!searchData.items?.length) return null

  const videoId: string = searchData.items[0].id.videoId
  const title: string = searchData.items[0].snippet.title

  const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${key}`
  const detailRes = await fetch(detailUrl)
  const detailData = await detailRes.json()

  const rawDuration: string = detailData.items?.[0]?.contentDetails?.duration ?? "PT0S"
  const durationSeconds = parseIso8601Duration(rawDuration)

  return { videoId, title, durationSeconds }
}
