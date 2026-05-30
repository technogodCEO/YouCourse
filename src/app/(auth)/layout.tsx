import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[--bg-base] flex flex-col items-center justify-center px-4 py-16">
      <div className="flex items-center gap-3 mb-10">
        <Image
          src="/images/YouCourseLogo.png"
          alt="YouCourse"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <span className="text-[20px] font-semibold text-[--text-primary]">YouCourse</span>
      </div>
      <div className="w-full max-w-[400px] rounded-xl border border-[--border] bg-[--bg-surface] p-8 shadow-sm">
        {children}
      </div>
    </main>
  )
}
