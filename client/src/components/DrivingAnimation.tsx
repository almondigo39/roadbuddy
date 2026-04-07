// Decorative animation showing a car driving on a road.
// Used on the main screen when the user is available/driving.

interface DrivingAnimationProps {
  variant?: 'driving' | 'idle'
}

export default function DrivingAnimation({ variant = 'driving' }: DrivingAnimationProps) {
  const isDriving = variant === 'driving'

  return (
    <div className="relative w-full h-44 mt-6 overflow-hidden rounded-[24px]"
         style={{
           background: isDriving
             ? 'linear-gradient(180deg, #B8E8FF 0%, #E8F4FB 100%)'
             : 'linear-gradient(180deg, #E5ECF3 0%, #F2F6FA 100%)',
         }}>
      {/* Sun / sky */}
      <div className="absolute top-3 left-4 w-10 h-10 rounded-full"
           style={{
             background: isDriving
               ? 'radial-gradient(circle, #FFD400 0%, #FFA033 70%)'
               : 'radial-gradient(circle, #B0BCCC 0%, #8B97A8 70%)',
             boxShadow: isDriving ? '0 0 30px rgba(255, 212, 0, 0.5)' : 'none',
           }} />

      {/* Distant mountains */}
      <svg className="absolute bottom-12 inset-x-0 w-full" viewBox="0 0 400 60" preserveAspectRatio="none">
        <path d="M0,60 L50,25 L100,40 L160,15 L220,35 L280,10 L340,30 L400,20 L400,60 Z"
              fill={isDriving ? '#7BC9E8' : '#C5D0DD'} opacity="0.6" />
      </svg>

      {/* Road */}
      <div className="absolute bottom-0 inset-x-0 h-12"
           style={{ background: 'linear-gradient(180deg, #3A4555 0%, #1F2733 100%)' }}>
        {/* Road dashes */}
        <div className="absolute top-1/2 inset-x-0 flex gap-4 -translate-y-1/2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-1 w-8 bg-yellow-300 rounded-full flex-shrink-0"
              style={{
                animation: isDriving ? 'road-dash 0.6s linear infinite' : 'none',
                animationDelay: `${i * -0.05}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Car */}
      <div
        className="absolute bottom-7"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          animation: isDriving ? 'car-bounce 0.4s ease-in-out infinite alternate' : 'none',
        }}
      >
        <svg width="80" height="44" viewBox="0 0 80 44" fill="none">
          {/* Body shadow */}
          <ellipse cx="40" cy="42" rx="34" ry="2" fill="rgba(0,0,0,0.25)" />
          {/* Car body */}
          <path d="M8 30 L12 18 Q14 14 18 14 L30 14 L36 8 Q38 6 42 6 L56 6 Q60 6 62 10 L68 14 L72 14 Q76 14 76 18 L76 30 Q76 34 72 34 L8 34 Q4 34 4 30 L8 30 Z"
                fill="url(#carBody)" stroke="#0085B3" strokeWidth="0.5" />
          {/* Windows */}
          <path d="M34 12 L38 8 L56 8 Q58 8 59 10 L62 14 L36 14 Z" fill="#1A2940" opacity="0.8" />
          <path d="M30 16 L32 14 L62 14 L62 22 L30 22 Z" fill="#5DD7FF" opacity="0.6" />
          {/* Headlight */}
          <circle cx="73" cy="22" r="2" fill="#FFD400" />
          {/* Wheels */}
          <circle cx="20" cy="34" r="6" fill="#1A1A1A" />
          <circle cx="20" cy="34" r="2.5" fill="#666" />
          <circle cx="60" cy="34" r="6" fill="#1A1A1A" />
          <circle cx="60" cy="34" r="2.5" fill="#666" />
          <defs>
            <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#33CCFF" />
              <stop offset="100%" stopColor="#00A8E0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Speed lines (only when driving) */}
        {isDriving && (
          <>
            <div className="absolute top-4 -right-6 w-6 h-0.5 bg-white/70 rounded-full"
                 style={{ animation: 'speed-line 0.5s ease-out infinite' }} />
            <div className="absolute top-7 -right-8 w-4 h-0.5 bg-white/50 rounded-full"
                 style={{ animation: 'speed-line 0.5s ease-out infinite', animationDelay: '0.15s' }} />
            <div className="absolute top-10 -right-5 w-5 h-0.5 bg-white/60 rounded-full"
                 style={{ animation: 'speed-line 0.5s ease-out infinite', animationDelay: '0.3s' }} />
          </>
        )}
      </div>

      <style>{`
        @keyframes road-dash {
          from { transform: translateX(0); }
          to { transform: translateX(-48px); }
        }
        @keyframes car-bounce {
          from { transform: translateX(-50%) translateY(0); }
          to { transform: translateX(-50%) translateY(-1.5px); }
        }
        @keyframes speed-line {
          0% { transform: translateX(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(-30px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
