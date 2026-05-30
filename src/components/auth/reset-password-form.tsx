"use client"

import { useActionState } from "react"
import { applyPasswordReset } from "@/actions/password-reset"

interface ResetPasswordFormProps {
  token: string
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, action, isPending] = useActionState(applyPasswordReset, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Hidden token input */}
      <input type="hidden" name="token" value={token} />

      {/* General error message (invalid/expired token) */}
      {state?.message && (
        <div
          className="flex items-start gap-3 p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 text-[14px] text-[#EF4444]"
          role="alert"
        >
          {state.message}
        </div>
      )}

      {/* Password field */}
      <div>
        <label
          htmlFor="password"
          className="block text-[14px] font-semibold text-[--text-secondary] mb-2"
        >
          New password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className={`w-full min-h-[44px] px-4 py-3 rounded-lg bg-[--bg-surface-raised] border text-[--text-primary] text-[16px] font-normal leading-relaxed placeholder:text-[--text-muted] transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            state?.errors?.password
              ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30"
              : "border-[--border] focus:border-[#F05A2A] focus:ring-1 focus:ring-[#F05A2A]/30"
          }`}
        />
        {state?.errors?.password && (
          <p className="mt-1.5 text-[14px] text-[#EF4444] leading-normal" role="alert">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold leading-none shadow-sm transition-opacity duration-150 hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        {isPending ? "Updating..." : "Set New Password"}
      </button>
    </form>
  )
}
