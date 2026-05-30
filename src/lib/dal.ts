import "server-only"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function verifySession() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  return { isAuth: true, userId: session.user.id as string }
}

export async function getUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return db.query.users.findFirst({ where: eq(users.id, session.user.id as string) })
}
