import Link from "next/link"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[--bg-base] flex flex-col">
      <header className="border-b border-[--border] bg-[--bg-surface]/95">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/images/YouCourseLogo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-[16px] font-semibold text-[--text-primary]">YouCourse</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[15px] font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-lg bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[15px] font-semibold hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-[48px] sm:text-[64px] leading-tight font-bold text-[--text-primary] max-w-3xl mb-6">
          Learn anything from{" "}
          <span className="bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] bg-clip-text text-transparent">
            YouTube
          </span>
          , with proof you understood it
        </h1>
        <p className="text-[18px] sm:text-[20px] text-[--text-secondary] max-w-xl mb-10 leading-relaxed">
          Enter a topic. We build a course from real YouTube videos, generate comprehension questions, and gate each lesson until you pass.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="inline-flex items-center justify-center min-h-[52px] px-8 py-4 rounded-xl bg-gradient-to-r from-[#F03C2E] to-[#FF7C1F] text-white text-[18px] font-semibold shadow-md hover:opacity-90 transition-opacity">
            Build a course — it&apos;s free
          </Link>
          <Link href="/login" className="inline-flex items-center justify-center min-h-[52px] px-8 py-4 rounded-xl border border-[--border] text-[18px] font-medium text-[--text-primary] hover:bg-[--bg-surface] transition-colors">
            Sign in
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl w-full text-left">
          {[
            { title: "Enter a topic", body: "Type anything — 'Python for beginners', 'music theory', 'how to invest'. We do the rest." },
            { title: "AI builds the course", body: "We find the best YouTube videos, fetch transcripts, and generate comprehension questions automatically." },
            { title: "Learn with accountability", body: "Watch each video, answer questions, and pass to unlock the next lesson. No skipping." },
            { title: "Creators still get paid", body: "Every video plays directly on YouTube — ads run, views count, and creators earn. We just add the structure." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm">
              <h3 className="text-[16px] font-semibold text-[--text-primary] mb-2">{item.title}</h3>
              <p className="text-[14px] text-[--text-secondary] leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
