"use client"

import { useActionState } from "react"
import { requestPasswordReset } from "@/actions/password-reset"

export default function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(requestPasswordReset, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Success message */}
      {state?.message && (
        <div
          className="flex items-start gap-3 p-4 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/25 text-[14px] text-[#22C55E]"
          role="alert"
        >
          {state.message}
        </div>
      )}

      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="block text-[14px] font-semibold text-[--text-secondary] mb-2"
        >
          Email address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full min-h-[44px] px-4 py-3 rounded-lg bg-[--bg-surface-raised] border border-[--border] text-[--text-primary] text-[16px] font-normal leading-relaxed placeholder:text-[--text-muted] transition-colors duration-150 focus:outline-none focus:border-[#F05A2A] focus:ring-1 focus:ring-[#F05A2A]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold leading-none shadow-sm transition-opacity duration-150 hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        {isPending ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  )
}
