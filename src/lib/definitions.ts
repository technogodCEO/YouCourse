import { z } from "zod"

export const SignupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }).max(72, { message: "Password must be 72 characters or less." }).trim(),
})

export const LoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
})

export type FormState =
  | { errors?: { email?: string[]; password?: string[] }; message?: string }
  | undefined
