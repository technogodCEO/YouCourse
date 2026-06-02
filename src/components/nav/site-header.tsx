import Link from "next/link"
import Image from "next/image"
import { getUser } from "@/lib/dal"
import { LogoutButton } from "@/components/auth/logout-button"

export async function SiteHeader() {
  const user = await getUser()

  return (
    <header className="sticky top-0 z-40 border-b border-[--border] bg-[--bg-surface]/95 backdrop-blur-sm">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/YouCourseLogo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-[16px] font-semibold text-[--text-primary]">YouCourse</span>
          </Link>
          <Link href="/catalog" className="text-[14px] font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">
            Browse
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="text-[14px] text-[--text-secondary] hover:text-[--text-primary] hidden sm:block transition-colors">
                {user.displayName ?? user.email}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-[15px] font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">Sign in</Link>
              <Link href="/signup" className="inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[15px] font-semibold hover:opacity-90 transition-opacity">Get started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
