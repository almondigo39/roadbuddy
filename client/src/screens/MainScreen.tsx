import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Users, User, CarFront, Activity, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { connectSocket, getSocket, disconnectSocket } from '../services/socket'
import { startDetection, stopDetection } from '../services/drivingDetection'
import AvailabilityToggle from '../components/AvailabilityToggle'
import FriendCard from '../components/FriendCard'
import DrivingAnimation from '../components/DrivingAnimation'

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

  const handleModeToggle = async () => {
    const newMode = isAutoMode ? 'MANUAL' : 'AUTO'
    try {
      await api.put('/users/me', { availabilityMode: newMode })
      updateUser({ availabilityMode: newMode })
      // When switching to manual, turn off availability
      if (newMode === 'MANUAL') {
        await setAvailability(false, null)
      }
    } catch {
      // Silently fail
    }
  }

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
    <div className="flex flex-col min-h-screen relative">
      {/* Decorative background gradient */}
      <div className="absolute top-0 inset-x-0 h-[280px] pointer-events-none"
           style={{ background: 'linear-gradient(180deg, rgba(51,204,255,0.18) 0%, rgba(51,204,255,0) 100%)' }} />

      {/* Glass header */}
      <header className="sticky top-0 z-30 glass border-b border-white/40">
        <div className="flex items-center justify-between px-5 py-3">
          <button
            onClick={() => navigate('/profile/setup')}
            className="flex items-center gap-3 press"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-md flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)' }}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="font-semibold text-text text-sm">{user?.name || 'משתמש'}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <CarFront className="w-5 h-5 text-primary-dark" />
            <h1 className="text-base font-bold tracking-tight" style={{ color: '#00A8E0' }}>RoadBuddy</h1>
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 hover:bg-white press shadow-sm"
          >
            <Settings className="w-5 h-5 text-text-light" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 px-5 py-5 pb-28 relative z-10">
        {/* Mode selector — segmented control iOS style */}
        <div className="mb-5 p-1 bg-white/70 backdrop-blur rounded-2xl shadow-sm border border-white flex relative">
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out pointer-events-none"
            style={{
              right: isAutoMode ? '4px' : 'calc(50% + 0px)',
              background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
              boxShadow: '0 4px 14px -4px rgba(0, 168, 224, 0.55)',
            }}
          />
          <button
            type="button"
            onClick={() => { if (!isAutoMode) handleModeToggle() }}
            className={`relative z-10 flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${
              isAutoMode ? 'text-white' : 'text-text-light'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>אוטומטי</span>
          </button>
          <button
            type="button"
            onClick={() => { if (isAutoMode) handleModeToggle() }}
            className={`relative z-10 flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors ${
              !isAutoMode ? 'text-white' : 'text-text-light'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>ידני</span>
          </button>
        </div>

        {/* Availability toggle / auto-mode status card */}
        <div className="mb-2">
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

        {/* Driving animation - reflects current state */}
        <div className="mb-6">
          <DrivingAnimation variant={isAvailable || isDriving ? 'driving' : 'idle'} />
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
        type="button"
        onClick={() => navigate('/friends')}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center text-white press z-40"
        style={{
          background: 'linear-gradient(135deg, #33CCFF 0%, #00A8E0 100%)',
          boxShadow: '0 14px 36px -8px rgba(0, 168, 224, 0.6), 0 4px 10px rgba(0, 168, 224, 0.3)',
        }}
      >
        <Users className="w-7 h-7" strokeWidth={2.4} />
      </button>
    </div>
  )
}
