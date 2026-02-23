export function MobileHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b border-surface-border bg-surface/95 backdrop-blur md:hidden">
      <img
        src="/gameratez-logo.png"
        alt="Gameratez"
        className="h-20 w-auto max-w-[400px] object-contain"
      />
    </header>
  )
}
