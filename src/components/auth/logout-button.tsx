import { logout } from "@/actions/auth"

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-transparent text-[--text-secondary] text-[16px] font-normal leading-none transition-colors duration-150 hover:bg-[--bg-surface-raised] hover:text-[--text-primary] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F05A2A] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Sign Out
      </button>
    </form>
  )
}
