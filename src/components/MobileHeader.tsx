export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-center border-b border-surface-border/70 bg-surface/80 backdrop-blur-xl md:hidden">
      <img
        src="/gameratez-logo.png"
        alt="Gameratez"
        className="h-14 w-auto max-w-[260px] object-contain"
      />
    </header>
  )
}
