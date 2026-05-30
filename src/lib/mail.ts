import { Resend } from "resend"
import PasswordResetEmail from "@/emails/reset-password"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "YouCourse <onboarding@resend.dev>", // dev sender; swap to verified domain pre-launch (RESEARCH Open Q1)
    to: email,
    subject: "Reset your YouCourse password",
    react: PasswordResetEmail({ resetUrl }),
  })
}
