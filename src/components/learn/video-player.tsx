"use client"

import YouTube from "react-youtube"

type Props = { videoId: string; onVideoComplete: () => void }

export function VideoPlayer({ videoId, onVideoComplete }: Props) {
  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
      <YouTube
        videoId={videoId}
        className="w-full h-full"
        iframeClassName="w-full h-full"
        opts={{ playerVars: { autoplay: 0 } }}
        onStateChange={(e) => {
          if (e.data === 0) onVideoComplete()
        }}
      />
    </div>
  )
}
