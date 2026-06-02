import Link from "next/link"
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"
import { courses } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { SiteHeader } from "@/components/nav/site-header"

type CourseWithMeta = {
  id: string
  title: string
  topic: string
  description: string | null
  lengthPreset: string
  createdAt: Date
  creator: { displayName: string | null; email: string } | null
  lessons: { id: string }[]
}

const getPublicCourses = unstable_cache(
  async (): Promise<CourseWithMeta[]> => {
    return db.query.courses.findMany({
      where: eq(courses.visibility, "public"),
      orderBy: [desc(courses.createdAt)],
      with: {
        creator: { columns: { displayName: true, email: true } },
        lessons: { columns: { id: true } },
      },
    }) as Promise<CourseWithMeta[]>
  },
  ["catalog-public-courses"],
  { revalidate: 60 }
)

const LENGTH_LABELS: Record<string, string> = { quick: "Quick", standard: "Standard", long: "Long" }

type SearchParams = Promise<{ q?: string; length?: string }>

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, length } = await searchParams
  const query = q?.trim().toLowerCase() ?? ""
  const lengthFilter = length && ["quick", "standard", "long"].includes(length) ? length : ""

  const allCourses = await getPublicCourses()
  const filtered = allCourses.filter((course) => {
    if (lengthFilter && course.lengthPreset !== lengthFilter) return false
    if (query) return course.title.toLowerCase().includes(query) || course.topic.toLowerCase().includes(query)
    return true
  })

  return (
    <div className="min-h-screen bg-[--bg-base]">
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-[32px] font-bold text-[--text-primary] mb-2">Browse Courses</h1>
        <p className="text-[16px] text-[--text-secondary] mb-8">AI-generated courses from YouTube. Watch, quiz, and prove your understanding.</p>
        <form method="GET" action="/catalog" className="flex flex-col sm:flex-row gap-3 mb-8">
          <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search by topic or title…" className="flex-1 min-h-[44px] px-4 py-3 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#F05A2A]/50" />
          {lengthFilter && <input type="hidden" name="length" value={lengthFilter} />}
          <button type="submit" className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[15px] font-semibold hover:opacity-90 transition-opacity">Search</button>
        </form>
        <div className="flex flex-wrap gap-2 mb-8">
          {["", "quick", "standard", "long"].map((preset) => {
            const label = preset === "" ? "All" : LENGTH_LABELS[preset]
            const isActive = lengthFilter === preset
            const params = new URLSearchParams()
            if (q) params.set("q", q)
            if (preset) params.set("length", preset)
            const href = `/catalog${params.size ? `?${params}` : ""}`
            return (
              <Link key={preset} href={href} className={`inline-flex items-center min-h-[36px] px-4 py-1.5 rounded-full border text-[14px] font-medium transition-colors ${isActive ? "border-[#F05A2A] bg-[#F05A2A]/10 text-[#F05A2A]" : "border-[--border] text-[--text-secondary] hover:border-[#F05A2A]/50 hover:text-[--text-primary]"}`}>
                {label}
              </Link>
            )
          })}
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-12 text-center">
            <p className="text-[16px] text-[--text-secondary]">{query || lengthFilter ? "No courses match your search." : "No public courses yet. Be the first to create one!"}</p>
            {(query || lengthFilter) && <Link href="/catalog" className="mt-4 inline-flex items-center text-[14px] text-[#F05A2A] hover:underline">Clear filters</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="rounded-xl border border-[--border] bg-[--bg-surface] p-5 shadow-sm hover:border-[#F05A2A]/40 transition-colors group flex flex-col gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-[--text-primary] leading-snug group-hover:text-[#F05A2A] transition-colors line-clamp-2 mb-1">{course.title}</h2>
                  {course.description && <p className="text-[13px] text-[--text-secondary] line-clamp-2">{course.description}</p>}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[12px] text-[--text-secondary]">{course.creator?.displayName ?? course.creator?.email ?? "Unknown"} · {course.lessons.length} lessons</span>
                  <span className="text-[12px] px-2 py-0.5 rounded-full border border-[--border] text-[--text-secondary]">{LENGTH_LABELS[course.lengthPreset] ?? course.lengthPreset}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
