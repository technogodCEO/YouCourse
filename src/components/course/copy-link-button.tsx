"use client"

import { useState } from "react"

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg border border-[--border] text-[16px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors"
    >
      {copied ? "Copied!" : "Copy Share Link"}
    </button>
  )
}
