// Global call state management context
// Handles WebRTC signaling, call lifecycle, and socket events

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { getSocket } from '../services/socket'
import { webrtcService } from '../services/webrtc'
import api from '../services/api'
import { useAuth } from './AuthContext'

interface Participant {
  id: string
  name: string
  avatarUrl?: string
}

interface ActiveCall {
  callId: string
  participants: Participant[]
}

interface IncomingCall {
  callId: string
  caller: Participant
}

interface CallContextType {
  activeCall: ActiveCall | null
  incomingCall: IncomingCall | null
  isMuted: boolean
  startCall: (participantIds: string[]) => Promise<void>
  acceptCall: (callId: string) => void
  rejectCall: (callId: string) => void
  endCall: () => void
  toggleMute: () => void
  addParticipant: (userId: string) => void
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const activeCallRef = useRef<ActiveCall | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    activeCallRef.current = activeCall
  }, [activeCall])

  /**
   * Initiate WebRTC connections to all participants in the current call.
   */
  const initiateWebRTCConnections = useCallback(async (callId: string, participantIds: string[]) => {
    const socket = getSocket()

    // Set up WebRTC callbacks
    webrtcService.setCallbacks(
      // On ICE candidate: relay to the target user through signaling
      (targetUserId, candidate) => {
        socket.emit('webrtc_ice', {
          callId,
          targetUserId,
          candidate: candidate.toJSON(),
        })
      },
      // On remote track: play the audio
      (_userId, stream) => {
        const audio = new Audio()
        audio.srcObject = stream
        audio.autoplay = true
        audio.play().catch(() => {
          // Autoplay may be blocked; user interaction needed
        })
      }
    )

    // Get local audio stream
    await webrtcService.getLocalStream()

    // Create offers for each participant
    for (const pid of participantIds) {
      if (pid === user?.id) continue
      webrtcService.createPeerConnection(pid)
      const offer = await webrtcService.createOffer(pid)
      socket.emit('webrtc_offer', { callId, targetUserId: pid, offer })
    }
  }, [user?.id])

  /**
   * Start a new call with the given participants.
   */
  const startCall = useCallback(async (participantIds: string[]) => {
    try {
      const res = await api.post('/calls/start', { participants: participantIds })
      const { callId } = res.data.data

      // Build participants list with self
      const participantUsers: Participant[] = [
        { id: user!.id, name: user!.name || '', avatarUrl: user!.avatarUrl },
      ]

      setActiveCall({ callId, participants: participantUsers })

      const socket = getSocket()
      socket.emit('call_invite', { callId, targetUserIds: participantIds })

      await initiateWebRTCConnections(callId, participantIds)
    } catch (error) {
      console.error('[CALL] Failed to start call:', error)
    }
  }, [user, initiateWebRTCConnections])

  /**
   * Accept an incoming call.
   */
  const acceptCall = useCallback(async (callId: string) => {
    try {
      await api.post(`/calls/${callId}/join`)
      const socket = getSocket()
      socket.emit('call_accept', { callId })

      const incoming = incomingCall
      if (incoming) {
        setActiveCall({
          callId,
          participants: [
            { id: user!.id, name: user!.name || '', avatarUrl: user!.avatarUrl },
            incoming.caller,
          ],
        })
      }
      setIncomingCall(null)

      // Get local stream ready for incoming offers
      await webrtcService.getLocalStream()

      // Set up callbacks
      webrtcService.setCallbacks(
        (targetUserId, candidate) => {
          socket.emit('webrtc_ice', {
            callId,
            targetUserId,
            candidate: candidate.toJSON(),
          })
        },
        (_userId, stream) => {
          const audio = new Audio()
          audio.srcObject = stream
          audio.autoplay = true
          audio.play().catch(() => {})
        }
      )
    } catch (error) {
      console.error('[CALL] Failed to accept call:', error)
    }
  }, [incomingCall, user])

  /**
   * Reject an incoming call.
   */
  const rejectCall = useCallback((callId: string) => {
    const socket = getSocket()
    socket.emit('call_reject', { callId })
    setIncomingCall(null)
  }, [])

  /**
   * End/leave the current active call.
   */
  const endCall = useCallback(async () => {
    const current = activeCallRef.current
    if (!current) return

    try {
      const socket = getSocket()
      socket.emit('call_end', { callId: current.callId })
      await api.post(`/calls/${current.callId}/leave`)
    } catch (error) {
      console.error('[CALL] Failed to end call:', error)
    } finally {
      webrtcService.cleanup()
      setActiveCall(null)
      setIsMuted(false)
    }
  }, [])

  /**
   * Toggle microphone mute.
   */
  const toggleMute = useCallback(() => {
    const muted = webrtcService.toggleMute()
    setIsMuted(muted)
  }, [])

  /**
   * Add a participant to the active call.
   */
  const addParticipant = useCallback(async (userId: string) => {
    const current = activeCallRef.current
    if (!current) return

    try {
      const socket = getSocket()
      socket.emit('call_invite', {
        callId: current.callId,
        targetUserIds: [userId],
      })

      // Create WebRTC connection to the new participant
      await webrtcService.getLocalStream()
      webrtcService.createPeerConnection(userId)
      const offer = await webrtcService.createOffer(userId)
      socket.emit('webrtc_offer', {
        callId: current.callId,
        targetUserId: userId,
        offer,
      })
    } catch (error) {
      console.error('[CALL] Failed to add participant:', error)
    }
  }, [])

  /**
   * Set up socket event listeners for call signaling.
   */
  useEffect(() => {
    if (!user) return

    const socket = getSocket()

    // Incoming call notification
    const handleIncoming = (data: { callId: string; from: Participant; participants: string[] }) => {
      // Don't show incoming if already in a call
      if (activeCallRef.current) return
      setIncomingCall({
        callId: data.callId,
        caller: data.from,
      })
    }

    // Someone accepted our call
    const handleAccepted = (data: { callId: string; userId: string }) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== data.callId) return prev
        // Participant info will be updated when we get their user data
        const alreadyExists = prev.participants.some((p) => p.id === data.userId)
        if (alreadyExists) return prev
        return {
          ...prev,
          participants: [...prev.participants, { id: data.userId, name: '', avatarUrl: undefined }],
        }
      })
    }

    // Someone rejected our call
    const handleRejected = (data: { callId: string; userId: string }) => {
      console.log(`[CALL] User ${data.userId} rejected call ${data.callId}`)
    }

    // Call ended by someone else
    const handleEnded = (data: { callId: string }) => {
      if (activeCallRef.current?.callId === data.callId) {
        webrtcService.cleanup()
        setActiveCall(null)
        setIsMuted(false)
      }
      // Also dismiss incoming call if it ended
      setIncomingCall((prev) => (prev?.callId === data.callId ? null : prev))
    }

    // User joined call
    const handleUserJoined = (data: { callId: string; userId: string; name: string }) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== data.callId) return prev
        const alreadyExists = prev.participants.some((p) => p.id === data.userId)
        if (alreadyExists) return prev
        return {
          ...prev,
          participants: [...prev.participants, { id: data.userId, name: data.name }],
        }
      })
    }

    // User left call
    const handleUserLeft = (data: { callId: string; userId: string }) => {
      setActiveCall((prev) => {
        if (!prev || prev.callId !== data.callId) return prev
        return {
          ...prev,
          participants: prev.participants.filter((p) => p.id !== data.userId),
        }
      })
    }

    // WebRTC offer received
    const handleOffer = async (data: { callId: string; fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      try {
        await webrtcService.getLocalStream()

        // Set up callbacks if not already set
        webrtcService.setCallbacks(
          (targetUserId, candidate) => {
            socket.emit('webrtc_ice', {
              callId: data.callId,
              targetUserId,
              candidate: candidate.toJSON(),
            })
          },
          (_userId, stream) => {
            const audio = new Audio()
            audio.srcObject = stream
            audio.autoplay = true
            audio.play().catch(() => {})
          }
        )

        const answer = await webrtcService.handleOffer(data.fromUserId, data.offer)
        socket.emit('webrtc_answer', {
          callId: data.callId,
          targetUserId: data.fromUserId,
          answer,
        })
      } catch (error) {
        console.error('[CALL] Failed to handle WebRTC offer:', error)
      }
    }

    // WebRTC answer received
    const handleAnswer = async (data: { callId: string; fromUserId: string; answer: RTCSessionDescriptionInit }) => {
      try {
        await webrtcService.handleAnswer(data.fromUserId, data.answer)
      } catch (error) {
        console.error('[CALL] Failed to handle WebRTC answer:', error)
      }
    }

    // ICE candidate received
    const handleIce = async (data: { callId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => {
      try {
        await webrtcService.handleIceCandidate(data.fromUserId, data.candidate)
      } catch (error) {
        console.error('[CALL] Failed to handle ICE candidate:', error)
      }
    }

    socket.on('call_incoming', handleIncoming)
    socket.on('call_accepted', handleAccepted)
    socket.on('call_rejected', handleRejected)
    socket.on('call_ended', handleEnded)
    socket.on('call_user_joined', handleUserJoined)
    socket.on('call_user_left', handleUserLeft)
    socket.on('webrtc_offer', handleOffer)
    socket.on('webrtc_answer', handleAnswer)
    socket.on('webrtc_ice', handleIce)

    return () => {
      socket.off('call_incoming', handleIncoming)
      socket.off('call_accepted', handleAccepted)
      socket.off('call_rejected', handleRejected)
      socket.off('call_ended', handleEnded)
      socket.off('call_user_joined', handleUserJoined)
      socket.off('call_user_left', handleUserLeft)
      socket.off('webrtc_offer', handleOffer)
      socket.off('webrtc_answer', handleAnswer)
      socket.off('webrtc_ice', handleIce)

      // Cleanup WebRTC on unmount
      webrtcService.cleanup()
    }
  }, [user])

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        isMuted,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        addParticipant,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}
