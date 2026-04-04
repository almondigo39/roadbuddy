import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Users, User, CarFront, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { connectSocket, getSocket, disconnectSocket } from '../services/socket'
import { startDetection, stopDetection } from '../services/drivingDetection'
import AvailabilityToggle from '../components/AvailabilityToggle'
import FriendCard from '../components/FriendCard'

interface Friend {
  id: string
  friendshipId: string
  name: string
  phoneNumber: string
  avatarUrl?: string
  isAvailable?: boolean
  isDriving?: boolean
}

export default function MainScreen() {
  const { user, updateUser } = useAuth()
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false)
  const [availableUntil, setAvailableUntil] = useState<string | null>(user?.availableUntil || null)
  const [isDriving, setIsDriving] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [isToggling, setIsToggling] = useState(false)
  const navigate = useNavigate()

  const isAutoMode = user?.availabilityMode === 'AUTO'

  // Helper to update availability on the server and emit via socket
  const setAvailability = useCallback(async (newStatus: boolean, untilDate?: string | null) => {
    try {
      await api.put('/users/me/status', {
        isAvailable: newStatus,
        availableUntil: untilDate ?? null,
      })
      setIsAvailable(newStatus)
      setAvailableUntil(untilDate ?? null)
      updateUser({ isAvailable: newStatus, availableUntil: untilDate ?? null })

      // Emit status update via socket
      const socket = getSocket()
      socket.emit('status_update', {
        isAvailable: newStatus,
        availableUntil: untilDate ?? null,
      })
    } catch {
      // Silently fail — availability will be stale until next update
    }
  }, [updateUser])

  // Connect socket and load friends on mount
  useEffect(() => {
    connectSocket()
    loadFriends()

    const socket = getSocket()

    // Listen for friend availability changes
    socket.on('friend_available', (data: { id: string; name: string; isAvailable: boolean }) => {
      setFriends(prev => prev.map(f => f.id === data.id ? { ...f, isAvailable: true } : f))
    })

    socket.on('friend_unavailable', (data: { id: string }) => {
      setFriends(prev => prev.map(f => f.id === data.id ? { ...f, isAvailable: false } : f))
    })

    // Listen for server-side availability expiry
    socket.on('availability_expired', () => {
      setIsAvailable(false)
      setAvailableUntil(null)
      updateUser({ isAvailable: false, availableUntil: null })
    })

    return () => {
      disconnectSocket()
    }
  }, [])

  // Driving detection for auto mode
  useEffect(() => {
    if (!isAutoMode) {
      stopDetection()
      return
    }

    startDetection((driving: boolean) => {
      setIsDriving(driving)
      setAvailability(driving)
    })

    return () => {
      stopDetection()
    }
  }, [isAutoMode, setAvailability])

  const loadFriends = async () => {
    try {
      const res = await api.get('/friends')
      setFriends(res.data.data)
    } catch {
      // Friends will be empty on error
    }
  }

  const handleSetDuration = async (minutes: number) => {
    setIsToggling(true)
    try {
      const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
      await setAvailability(true, until)
    } catch {
      // Revert on error
    } finally {
      setIsToggling(false)
    }
  }

  const handleTurnOff = useCallback(async () => {
    setIsToggling(true)
    try {
      await setAvailability(false, null)
    } catch {
      // Revert on error
    } finally {
      setIsToggling(false)
    }
  }, [setAvailability])

  const handleNudge = async (friendId: string) => {
    try {
      await api.post(`/nudge/${friendId}`)
    } catch {
      // Nudge failed silently
    }
  }

  const availableFriends = friends.filter(f => f.isAvailable)
  const unavailableFriends = friends.filter(f => !f.isAvailable)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-text-light" />
            )}
          </div>
          <span className="font-semibold text-text">{user?.name || 'משתמש'}</span>
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-primary">RoadBuddy</h1>
          <CarFront className="w-6 h-6 text-primary" />
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-5 h-5 text-text-light" />
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 px-5 py-6 pb-24">
        {/* Auto mode status indicator */}
        {isAutoMode && (
          <div className="flex items-center gap-2 mb-3 text-sm text-text-light">
            <Activity className="w-4 h-4" />
            <span>זיהוי נסיעה פעיל</span>
            {/* Pulsing dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          </div>
        )}

        {/* Availability toggle / auto-mode status card */}
        <div className="mb-8">
          <AvailabilityToggle
            isAvailable={isAvailable}
            availableUntil={availableUntil}
            onSetDuration={handleSetDuration}
            onTurnOff={handleTurnOff}
            isLoading={isToggling}
            autoMode={isAutoMode}
            isDriving={isDriving}
          />
        </div>

        {/* Available friends */}
        {isAvailable && (
          <div>
            {availableFriends.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-available rounded-full" />
                  חברים זמינים ({availableFriends.length})
                </h2>
                <div className="flex flex-col gap-3">
                  {availableFriends.map(friend => (
                    <FriendCard key={friend.id} friend={friend} onNudge={handleNudge} />
                  ))}
                </div>
              </div>
            )}

            {unavailableFriends.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-text-light mb-3">
                  חברים נוספים
                </h2>
                <div className="flex flex-col gap-3">
                  {unavailableFriends.map(friend => (
                    <FriendCard key={friend.id} friend={friend} onNudge={handleNudge} />
                  ))}
                </div>
              </div>
            )}

            {friends.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-text-light text-lg mb-2">
                  אין לך חברים עדיין
                </p>
                <button
                  onClick={() => navigate('/friends')}
                  className="text-primary font-semibold hover:underline"
                >
                  הוסיפו חברים
                </button>
              </div>
            )}

            {friends.length > 0 && availableFriends.length === 0 && (
              <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                <p className="text-text-light text-base">
                  אף אחד מהחברים שלך לא זמין כרגע
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating action button - navigate to friends list */}
      <button
        onClick={() => navigate('/friends')}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-secondary rounded-full flex items-center justify-center text-white shadow-xl hover:bg-secondary-light transition-colors active:scale-95"
        style={{ maxWidth: '480px' }}
      >
        <Users className="w-6 h-6" />
      </button>
    </div>
  )
}
