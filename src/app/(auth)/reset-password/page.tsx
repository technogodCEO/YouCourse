import Link from "next/link"
import ResetPasswordForm from "@/components/auth/reset-password-form"

export const metadata = {
  title: "Set New Password — YouCourse",
}

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams

  if (!token) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary]">
            Set New Password
          </h1>
        </div>
        <div
          className="flex items-start gap-3 p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 text-[14px] text-[#EF4444]"
          role="alert"
        >
          This reset link is invalid. Request a new one.
        </div>
        <p className="mt-6 text-center text-[14px] text-[--text-secondary]">
          <Link
            href="/forgot-password"
            className="text-[--text-primary] font-semibold hover:opacity-80 transition-opacity duration-150"
          >
            Request a new reset link
          </Link>
        </p>
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary]">
          Set New Password
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-[--text-secondary]">
          Choose a strong password for your account.
        </p>
      </div>

      <ResetPasswordForm token={token} />
    </>
  )
}
