interface RateBubbleProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function RateBubble({ rating, size = 'md', className = '' }: RateBubbleProps) {
  const clamped = Math.min(10, Math.max(1, Math.round(rating)))
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl',
  }

  let gradientClasses = ''
  if (clamped >= 9) {
    // S‑tier: neon green / gold
    gradientClasses = 'from-emerald-400 via-lime-400 to-gold-400 text-black'
  } else if (clamped >= 7) {
    // A‑tier: cyan / blue
    gradientClasses = 'from-sky-400 via-cyan-400 to-blue-500 text-black'
  } else if (clamped >= 5) {
    // B‑tier: neutral steel
    gradientClasses = 'from-slate-400 via-slate-500 to-slate-600 text-black'
  } else if (clamped >= 3) {
    // C‑tier: warning orange
    gradientClasses = 'from-orange-400 via-amber-500 to-orange-600 text-black'
  } else {
    // D‑tier: red (bad)
    gradientClasses = 'from-red-500 via-rose-500 to-red-700 text-black'
  }

  return (
    <div
      className={`
        flex items-center justify-center rounded-full font-bold
        bg-gradient-to-br ${gradientClasses}
        shadow-[0_0_0_2px_rgba(234,179,8,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]
        transition-transform duration-200 ease-out
        hover:scale-110 hover:shadow-[0_0_0_3px_rgba(234,179,8,0.6),0_0_24px_rgba(234,179,8,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]
        cursor-default
        font-agency
        ${sizeClasses[size]} ${className}
      `}
      title={`Rating: ${clamped}/10`}
    >
      {clamped}
    </div>
  )
}
