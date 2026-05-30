import Link from "next/link"
import Image from "next/image"
import { getUser } from "@/lib/dal"
import { LogoutButton } from "@/components/auth/logout-button"

export default async function DashboardPage() {
  const user = await getUser()

  return (
    <div className="min-h-screen bg-[--bg-base] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[--border] bg-[--bg-surface]/95 backdrop-blur-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image
              src="/images/YouCourseLogo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-[16px] font-semibold text-[--text-primary]">YouCourse</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-[--text-secondary] hidden sm:block">
              {user?.displayName ?? user?.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <section>
              <h1 className="text-[28px] leading-tight font-semibold text-[--text-primary] mb-1">
                Welcome back{user?.displayName ? `, ${user.displayName}` : ""}
              </h1>
              <p className="text-[16px] text-[--text-secondary]">{user?.email}</p>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm">
                <h2 className="text-[20px] font-semibold text-[--text-primary] leading-snug mb-3">
                  In Progress
                </h2>
                <p className="text-[16px] text-[--text-secondary]">
                  You haven&apos;t started a course yet. Browse the catalog to find one.
                </p>
                <button
                  disabled
                  className="mt-4 inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold leading-none shadow-sm opacity-40 cursor-not-allowed"
                >
                  Browse Catalog
                </button>
              </section>
              <section className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm">
                <h2 className="text-[20px] font-semibold text-[--text-primary] leading-snug mb-3">
                  My Courses
                </h2>
                <p className="text-[16px] text-[--text-secondary]">
                  You haven&apos;t created a course yet. Build one from any YouTube topic in minutes.
                </p>
                <button
                  disabled
                  className="mt-4 inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[16px] font-semibold leading-none shadow-sm opacity-40 cursor-not-allowed"
                >
                  Generate Course
                </button>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
