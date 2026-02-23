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

  return (
    <div
      className={`
        flex items-center justify-center rounded-full font-bold text-black
        bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600
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
