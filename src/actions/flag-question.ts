"use server"

import { db } from "@/lib/db"
import { questionFlags } from "@/lib/db/schema"
import { verifySession } from "@/lib/dal"
import { and, eq } from "drizzle-orm"

export async function flagQuestion(
  questionId: string
): Promise<{ flagged: boolean } | { error: string }> {
  const session = await verifySession()

  const existing = await db.query.questionFlags.findFirst({
    where: and(
      eq(questionFlags.questionId, questionId),
      eq(questionFlags.userId, session.userId)
    ),
  })

  if (existing) {
    await db.delete(questionFlags).where(eq(questionFlags.id, existing.id))
    return { flagged: false }
  }

  await db.insert(questionFlags).values({
    questionId,
    userId: session.userId,
  })
  return { flagged: true }
}
