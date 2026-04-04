import { useState, useEffect } from 'react'
import { CarFront, Pause, Clock, X } from 'lucide-react'

interface AvailabilityToggleProps {
  isAvailable: boolean
  availableUntil?: string | null
  onSetDuration: (minutes: number) => void
  onTurnOff: () => void
  isLoading?: boolean
  autoMode?: boolean
  isDriving?: boolean
}

const DURATION_OPTIONS = [
  { minutes: 5, label: '5 דק׳' },
  { minutes: 15, label: '15 דק׳' },
  { minutes: 30, label: '30 דק׳' },
]

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Large, prominent toggle switch for availability status
export default function AvailabilityToggle({
  isAvailable,
  availableUntil,
  onSetDuration,
  onTurnOff,
  isLoading,
  autoMode = false,
  isDriving = false,
}: AvailabilityToggleProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Countdown timer
  useEffect(() => {
    if (!isAvailable || !availableUntil) {
      setTimeRemaining(0)
      return
    }

    const updateRemaining = () => {
      const remaining = new Date(availableUntil).getTime() - Date.now()
      setTimeRemaining(Math.max(0, remaining))
      if (remaining <= 0) {
        onTurnOff()
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [isAvailable, availableUntil, onTurnOff])

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

  // Manual mode: AVAILABLE state — show countdown + cancel button
  if (isAvailable && availableUntil) {
    const progress = timeRemaining > 0
      ? (timeRemaining / (new Date(availableUntil).getTime() - (new Date(availableUntil).getTime() - 30 * 60 * 1000)))
      : 0

    return (
      <div className="w-full rounded-3xl shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--color-available)' }}>
        <div className="py-5 px-6">
          <div className="flex items-center justify-center gap-3 text-white mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="font-bold text-xl">זמין/ה לשיחות</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-white/90">
            <Clock className="w-4 h-4" />
            <span className="text-lg font-mono font-semibold">{formatTimeRemaining(timeRemaining)}</span>
          </div>
        </div>
        <button
          onClick={onTurnOff}
          disabled={isLoading}
          className="w-full py-3 bg-white/20 text-white font-semibold hover:bg-white/30 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <X className="w-4 h-4" />
          <span>סיום זמינות</span>
        </button>
      </div>
    )
  }

  // Manual mode: NOT AVAILABLE — show duration selection buttons
  return (
    <div className="w-full">
      <p className="text-center text-text-light text-sm mb-3">לכמה זמן להיות זמין/ה?</p>
      <div className="flex gap-3">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.minutes}
            onClick={() => onSetDuration(option.minutes)}
            disabled={isLoading}
            className="flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-200 active:scale-[0.95] disabled:opacity-70 shadow-md border-2 border-gray-200 bg-white text-text hover:border-primary hover:text-primary hover:shadow-lg"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
