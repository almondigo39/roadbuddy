import { CarFront, Pause } from 'lucide-react'

interface AvailabilityToggleProps {
  isAvailable: boolean
  onToggle: () => void
  isLoading?: boolean
  autoMode?: boolean
  isDriving?: boolean
}

// Large, prominent toggle switch for availability status
export default function AvailabilityToggle({
  isAvailable,
  onToggle,
  isLoading,
  autoMode = false,
  isDriving = false,
}: AvailabilityToggleProps) {
  // Auto mode: show a non-interactive status card
  if (autoMode) {
    if (isDriving) {
      return (
        <div className="w-full py-5 rounded-3xl shadow-lg" style={{ backgroundColor: 'var(--color-available)' }}>
          <div className="flex items-center justify-center gap-3 text-white">
            <CarFront className="w-6 h-6" />
            <span className="font-bold text-xl">בנסיעה — זמין/ה לשיחות</span>
            {/* Pulsing green dot */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
          </div>
          <p className="text-center text-white/70 text-xs mt-2">
            מצב אוטומטי — הזמינות משתנה לפי זיהוי נסיעה
          </p>
        </div>
      )
    }

    return (
      <div className="w-full py-5 rounded-3xl shadow-lg bg-gray-400">
        <div className="flex items-center justify-center gap-3 text-white">
          <Pause className="w-6 h-6" />
          <span className="font-bold text-xl">לא בנסיעה</span>
        </div>
        <p className="text-center text-white/70 text-xs mt-2">
          מצב אוטומטי — הזמינות משתנה לפי זיהוי נסיעה
        </p>
      </div>
    )
  }

  // Manual mode: interactive toggle button
  return (
    <button
      onClick={onToggle}
      disabled={isLoading}
      className="w-full py-5 rounded-3xl font-bold text-xl transition-all duration-300 active:scale-[0.97] disabled:opacity-70 shadow-lg"
      style={{
        backgroundColor: isAvailable ? 'var(--color-available)' : '#9CA3AF',
        color: 'white',
      }}
    >
      <div className="flex items-center justify-center gap-3">
        {/* Toggle indicator */}
        <div className="relative w-14 h-8 rounded-full bg-white/30">
          <div
            className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300"
            style={{
              left: isAvailable ? '2rem' : '0.25rem',
            }}
          />
        </div>
        <span>{isAvailable ? 'אני זמין/ה' : 'לא זמין/ה'}</span>
      </div>
    </button>
  )
}
