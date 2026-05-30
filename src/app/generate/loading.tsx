export default function GenerateLoading() {
  return (
    <div className="min-h-screen bg-[--bg-base] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[520px]">
        <div className="h-9 w-64 rounded-lg bg-[--bg-surface] animate-pulse mb-2" />
        <div className="h-5 w-80 rounded bg-[--bg-surface] animate-pulse mb-8" />
        <div className="rounded-xl border border-[--border] bg-[--bg-surface] p-6 shadow-sm space-y-4">
          <div className="h-4 w-40 rounded bg-[--border] animate-pulse" />
          <div className="h-11 rounded-lg bg-[--border] animate-pulse" />
          <div className="h-4 w-32 rounded bg-[--border] animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-[--border] animate-pulse" />
            ))}
          </div>
          <div className="h-11 rounded-lg bg-[--border] animate-pulse" />
        </div>
      </div>
    </div>
  )
}
