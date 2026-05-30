"use server"

import { db } from "@/lib/db"
import { users, passwordResetTokens } from "@/lib/db/schema"
import { sendPasswordResetEmail } from "@/lib/mail"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { eq, and, gt } from "drizzle-orm"
import { redirect } from "next/navigation"
import type { FormState } from "@/lib/definitions"

// Extended form state for password-only errors used in apply step
type PasswordResetFormState =
  | { errors?: { password?: string[] }; message?: string }
  | undefined

export async function requestPasswordReset(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const email = (formData.get("email") as string | null)?.trim() ?? ""

  // SECURITY: Always return the same success-style message regardless of
  // whether the account exists — do not leak email existence
  const successMessage = `Check your inbox — we sent a reset link to ${email}.`

  if (!email || !email.includes("@")) {
    return { message: successMessage }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  // Only proceed if user exists — but surface identical message either way
  if (user) {
    // Delete any existing token for this email (single active token policy)
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.email, email))

    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.insert(passwordResetTokens).values({
      email,
      token,
      expires,
    })

    await sendPasswordResetEmail(email, token)
  }

  return { message: successMessage }
}

export async function applyPasswordReset(
  _state: PasswordResetFormState,
  formData: FormData
): Promise<PasswordResetFormState> {
  const token = (formData.get("token") as string | null) ?? ""
  const password = (formData.get("password") as string | null) ?? ""

  // Validate password length
  if (password.length < 8) {
    return {
      errors: { password: ["Password must be at least 8 characters."] },
    }
  }

  // Find a non-expired token
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, token),
      gt(passwordResetTokens.expires, new Date())
    ),
  })

  if (!row) {
    return {
      message: "This reset link is invalid or has expired. Request a new one.",
    }
  }

  // Hash and update password
  const hashed = await bcrypt.hash(password, 12)
  await db.update(users).set({ password: hashed }).where(eq(users.email, row.email))

  // Consume the token (single-use)
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token))

  redirect("/login")
}
