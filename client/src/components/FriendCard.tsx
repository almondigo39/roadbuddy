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
    <div
      className="bg-white rounded-[22px] p-4 flex items-center gap-4 border border-white"
      style={{ boxShadow: '0 1px 2px rgba(20,33,61,0.04), 0 10px 24px -8px rgba(20,33,61,0.08)' }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #5DD7FF 0%, #00A8E0 100%)' }}
        >
          {friend.avatarUrl ? (
            <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-white" />
          )}
        </div>
        {/* Availability indicator */}
        {friend.isAvailable && (
          <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full border-2 border-white"
               style={{ background: '#2ED573', boxShadow: '0 0 0 3px rgba(46,213,115,0.25)' }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text truncate text-base">{friend.name}</h3>
        {friend.isAvailable ? (
          <p className="text-xs font-medium" style={{ color: '#20BF6B' }}>● זמין/ה לשיחה</p>
        ) : (
          <p className="text-xs text-text-light">לא זמין/ה</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        {friend.isAvailable ? (
          <button
            onClick={handleCall}
            disabled={!!activeCall}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white press disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #2ED573 0%, #20BF6B 100%)',
              boxShadow: '0 8px 20px -6px rgba(46, 213, 115, 0.6)',
            }}
          >
            <Phone className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => onNudge?.(friend.id)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center press"
            style={{
              background: 'rgba(255, 136, 0, 0.12)',
              color: '#FF8800',
            }}
          >
            <Bell className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
