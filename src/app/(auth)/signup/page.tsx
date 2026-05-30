import Link from "next/link"
import { SignupForm } from "@/components/auth/signup-form"

export default function SignupPage() {
  return (
    <>
      <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-6">
        Create Account
      </h1>
      <SignupForm />
      <p className="mt-6 text-center text-[14px] text-[--text-secondary]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#F05A2A] hover:opacity-80 transition-opacity duration-150">
          Sign in
        </Link>
      </p>
    </>
  )
}
