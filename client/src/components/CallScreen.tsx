// Full-screen overlay component for active voice calls

import { useState, useEffect, useCallback } from 'react'
import { Mic, MicOff, Phone, UserPlus, User, X } from 'lucide-react'
import { useCall } from '../contexts/CallContext'
import api from '../services/api'

interface Participant {
  id: string
  name: string
  avatarUrl?: string
}

interface CallScreenProps {
  callId: string
  participants: Participant[]
  onEnd: () => void
}

export default function CallScreen({ callId: _callId, participants, onEnd }: CallScreenProps) {
  const { isMuted, toggleMute, addParticipant } = useCall()
  const [duration, setDuration] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [friends, setFriends] = useState<Participant[]>([])

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Load friends for the add participant modal
  const loadFriends = useCallback(async () => {
    try {
      const res = await api.get('/friends')
      const friendList = res.data.data || []
      // Filter out participants already in the call
      const participantIds = new Set(participants.map((p) => p.id))
      const availableFriends = friendList
        .filter((f: Participant & { isAvailable?: boolean }) => !participantIds.has(f.id))
        .map((f: Participant) => ({ id: f.id, name: f.name, avatarUrl: f.avatarUrl }))
      setFriends(availableFriends)
    } catch {
      console.error('[CALL] Failed to load friends')
    }
  }, [participants])

  const handleAddParticipant = (userId: string) => {
    if (participants.length >= 5) return
    addParticipant(userId)
    setShowAddModal(false)
  }

  const handleOpenAddModal = () => {
    loadFriends()
    setShowAddModal(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col" dir="rtl">
      {/* Top section: title and timer */}
      <div className="flex flex-col items-center pt-12 pb-6">
        <h2 className="text-white text-xl font-bold mb-2">שיחה פעילה</h2>
        <span className="text-gray-400 text-lg font-mono">{formatDuration(duration)}</span>
      </div>

      {/* Center: Participant grid */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="grid grid-cols-2 gap-6 max-w-md w-full">
          {participants.map((participant) => (
            <div key={participant.id} className="flex flex-col items-center gap-2">
              <div className="relative">
                {/* Pulsing speaking indicator */}
                <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse opacity-60" />
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-600">
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
              </div>
              <span className="text-white text-sm font-medium truncate max-w-[120px]">
                {participant.name || 'משתמש'}
              </span>
            </div>
          ))}

          {/* Waiting indicator when only self is in the call */}
          {participants.length <= 1 && (
            <div className="flex flex-col items-center gap-2 col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-gray-400 text-sm">מחכה לתשובה...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-center gap-6 pb-12 pt-6">
        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* End call */}
        <button
          onClick={onEnd}
          className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors active:scale-95"
        >
          <Phone className="w-7 h-7 rotate-[135deg]" />
        </button>

        {/* Add participant */}
        <button
          onClick={handleOpenAddModal}
          className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/20"
          disabled={participants.length >= 5}
        >
          <UserPlus className="w-6 h-6" />
        </button>
      </div>

      {/* Add participant modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">הוסף משתתף</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {friends.length === 0 ? (
              <p className="text-gray-400 text-center py-4">אין חברים זמינים להוספה</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleAddParticipant(friend.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <span className="text-white font-medium">{friend.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
