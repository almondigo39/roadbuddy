import { Phone, Bell, User } from 'lucide-react'
import { useCall } from '../contexts/CallContext'

interface Friend {
  id: string
  name: string
  phoneNumber: string
  avatarUrl?: string
  isAvailable?: boolean
}

interface FriendCardProps {
  friend: Friend
  onNudge?: (friendId: string) => void
}

// Card component displaying a friend with call/nudge actions
export default function FriendCard({ friend, onNudge }: FriendCardProps) {
  const { startCall, activeCall } = useCall()

  const handleCall = () => {
    // Don't start a new call if already in one
    if (activeCall) return
    startCall([friend.id])
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
          {friend.avatarUrl ? (
            <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-text-light" />
          )}
        </div>
        {/* Availability indicator */}
        {friend.isAvailable && (
          <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 bg-available rounded-full border-2 border-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text truncate">{friend.name}</h3>
        {friend.isAvailable ? (
          <p className="text-sm text-available-dark">זמין/ה לשיחה</p>
        ) : (
          <p className="text-sm text-text-light">לא זמין/ה</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        {friend.isAvailable ? (
          <button
            onClick={handleCall}
            disabled={!!activeCall}
            className="w-12 h-12 bg-available rounded-xl flex items-center justify-center text-white hover:bg-available-dark transition-colors active:scale-95 disabled:opacity-50"
          >
            <Phone className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => onNudge?.(friend.id)}
            className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary hover:bg-primary/20 transition-colors active:scale-95"
          >
            <Bell className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
