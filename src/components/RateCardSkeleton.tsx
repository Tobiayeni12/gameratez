export function RateCardSkeleton() {
  return (
    <article className="relative overflow-hidden rounded-2xl px-4 py-3">
      <div className="flex gap-3 animate-pulse">
        <div className="h-12 w-12 shrink-0 rounded-full bg-surface-hover" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-28 rounded-full bg-surface-hover" />
            <div className="h-3 w-16 rounded-full bg-surface-hover/80" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded-full bg-surface-hover/80" />
            <div className="h-3 w-2/3 rounded-full bg-surface-hover/60" />
          </div>
          <div className="mt-2 h-28 w-full rounded-2xl bg-surface-hover/70" />
        </div>
      </div>
    </article>
  )
}

