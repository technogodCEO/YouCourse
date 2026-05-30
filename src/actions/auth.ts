'use server'
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { signIn, signOut } from "@/lib/auth"
import { SignupSchema, LoginSchema, type FormState } from "@/lib/definitions"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"

export async function signup(state: FormState, formData: FormData): Promise<FormState> {
  const validated = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }
  const { email, password } = validated.data
  const hashed = await bcrypt.hash(password, 12)

  try {
    await db.insert(users).values({ email, password: hashed })
  } catch {
    return { message: "An account with this email already exists. Sign in instead?" }
  }

  // signIn throws a redirect — do not catch it alongside the insert try/catch
  await signIn("credentials", { email, password, redirectTo: "/dashboard" })
}

export async function login(state: FormState, formData: FormData): Promise<FormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }
  const { email, password } = validated.data

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: "Incorrect email or password. Double-check your details and try again." }
    }
    throw error
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" })
}
