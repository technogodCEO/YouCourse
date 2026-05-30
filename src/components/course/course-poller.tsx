"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function CoursePoller() {
  const router = useRouter()
  useEffect(() => {
    const timer = setTimeout(() => router.refresh(), 3000)
    return () => clearTimeout(timer)
  }, [router])
  return null
}
