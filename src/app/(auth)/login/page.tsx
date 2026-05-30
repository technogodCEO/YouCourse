import Link from "next/link"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <>
      <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-6">
        Sign In
      </h1>
      <LoginForm />
      <p className="mt-6 text-center text-[14px] text-[--text-secondary]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#F05A2A] hover:opacity-80 transition-opacity duration-150">
          Create one
        </Link>
      </p>
    </>
  )
}
