'use client'
import { useActionState } from "react"
import { login } from "@/actions/auth"
import type { FormState } from "@/lib/definitions"

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="email"
          className="block text-[14px] font-semibold text-[--text-secondary] mb-2"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full min-h-[44px] px-4 py-3 rounded-lg bg-[--bg-surface-raised] border border-[--border] text-[--text-primary] text-[16px] font-normal leading-relaxed placeholder:text-[--text-muted] transition-colors duration-150 focus:outline-none focus:border-[#F05A2A] focus:ring-1 focus:ring-[#F05A2A]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {state?.errors?.email && (
          <p className="mt-1.5 text-[14px] text-[#EF4444] leading-normal">
            {state.errors.email[0]}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-[14px] font-semibold text-[--text-secondary] mb-2"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full min-h-[44px] px-4 py-3 rounded-lg bg-[--bg-surface-raised] border border-[--border] text-[--text-primary] text-[16px] font-normal leading-relaxed placeholder:text-[--text-muted] transition-colors duration-150 focus:outline-none focus:border-[#F05A2A] focus:ring-1 focus:ring-[#F05A2A]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {state?.errors?.password && (
          <p className="mt-1.5 text-[14px] text-[#EF4444] leading-normal">
            {state.errors.password[0]}
          </p>
        )}
      </div>
      {state?.message && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/25 text-[14px] text-[#EF4444]">
          {state.message}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold leading-none shadow-sm transition-opacity duration-150 hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
      >
        Sign In
      </button>
    </form>
  )
}
