import Link from "next/link"
import ForgotPasswordForm from "@/components/auth/forgot-password-form"

export const metadata = {
  title: "Reset Password — YouCourse",
}

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary]">
          Reset Password
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-[--text-secondary]">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-[14px] text-[--text-secondary]">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-[--text-primary] font-semibold hover:opacity-80 transition-opacity duration-150"
        >
          Sign In
        </Link>
      </p>
    </>
  )
}
