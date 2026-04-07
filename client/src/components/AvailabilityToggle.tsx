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
        <div
          className="w-full py-6 rounded-[28px] animate-ios-pop"
          style={{
            background: 'linear-gradient(135deg, #2ED573 0%, #20BF6B 100%)',
            boxShadow: '0 18px 40px -12px rgba(46, 213, 115, 0.55)',
          }}
        >
          <div className="flex items-center justify-center gap-3 text-white">
            <CarFront className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight">בנסיעה — זמין/ה לשיחות</span>
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
      <div
        className="w-full py-6 rounded-[28px]"
        style={{
          background: 'linear-gradient(135deg, #B0BCCC 0%, #8B97A8 100%)',
          boxShadow: '0 12px 30px -10px rgba(108, 122, 147, 0.4)',
        }}
      >
        <div className="flex items-center justify-center gap-3 text-white">
          <Pause className="w-6 h-6" />
          <span className="font-bold text-xl tracking-tight">לא בנסיעה</span>
        </div>
        <p className="text-center text-white/70 text-xs mt-2">
          מצב אוטומטי — הזמינות משתנה לפי זיהוי נסיעה
        </p>
      </div>
    )
  }

  // Manual mode: AVAILABLE state — show countdown + cancel button
  if (isAvailable && availableUntil) {
    return (
      <div
        className="w-full rounded-[28px] overflow-hidden animate-ios-pop"
        style={{
          background: 'linear-gradient(135deg, #2ED573 0%, #20BF6B 100%)',
          boxShadow: '0 18px 40px -12px rgba(46, 213, 115, 0.55)',
        }}
      >
        <div className="py-6 px-6">
          <div className="flex items-center justify-center gap-3 text-white mb-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="font-bold text-2xl tracking-tight">זמין/ה לשיחות</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-white">
            <Clock className="w-5 h-5" />
            <span className="text-2xl font-mono font-bold tabular-nums">{formatTimeRemaining(timeRemaining)}</span>
          </div>
        </div>
        <button
          onClick={onTurnOff}
          disabled={isLoading}
          className="w-full py-4 bg-white/15 backdrop-blur text-white font-semibold transition-colors active:bg-white/25 flex items-center justify-center gap-2 disabled:opacity-70 border-t border-white/20"
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
      <p className="text-center text-text-light text-sm mb-3 font-medium">לכמה זמן להיות זמין/ה?</p>
      <div className="flex gap-3">
        {DURATION_OPTIONS.map((option, idx) => (
          <button
            key={option.minutes}
            onClick={() => onSetDuration(option.minutes)}
            disabled={isLoading}
            className="flex-1 py-5 rounded-[22px] font-bold text-lg press disabled:opacity-70 text-white relative overflow-hidden"
            style={{
              background: idx === 0
                ? 'linear-gradient(135deg, #5DD7FF 0%, #33CCFF 100%)'
                : idx === 1
                ? 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)'
                : 'linear-gradient(135deg, #00A8E0 0%, #0085B3 100%)',
              boxShadow: '0 12px 28px -10px rgba(0, 168, 224, 0.5)',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
