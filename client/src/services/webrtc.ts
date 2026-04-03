// WebRTC service for managing peer connections in voice calls

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

type OnIceCandidateCallback = (userId: string, candidate: RTCIceCandidate) => void
type OnTrackCallback = (userId: string, stream: MediaStream) => void

class WebRTCService {
  private peers: Map<string, RTCPeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private onIceCandidateCb: OnIceCandidateCallback | null = null
  private onTrackCb: OnTrackCallback | null = null

  /**
   * Set global callbacks for ICE candidates and remote tracks.
   */
  setCallbacks(onIceCandidate: OnIceCandidateCallback, onTrack: OnTrackCallback): void {
    this.onIceCandidateCb = onIceCandidate
    this.onTrackCb = onTrack
  }

  /**
   * Get an audio-only media stream from the user's microphone.
   */
  async getLocalStream(): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      })
    }
    return this.localStream
  }

  /**
   * Create a new RTCPeerConnection for a specific remote user.
   */
  createPeerConnection(userId: string): RTCPeerConnection {
    // Close existing connection to this user if any
    const existing = this.peers.get(userId)
    if (existing) {
      existing.close()
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local audio tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCb) {
        this.onIceCandidateCb(userId, event.candidate)
      }
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      if (this.onTrackCb && event.streams[0]) {
        this.onTrackCb(userId, event.streams[0])
      }
    }

    this.peers.set(userId, pc)
    return pc
  }

  /**
   * Create an SDP offer to send to a remote user.
   */
  async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
    let pc = this.peers.get(userId)
    if (!pc) {
      pc = this.createPeerConnection(userId)
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
  }

  /**
   * Handle a received SDP offer and return an answer.
   */
  async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    let pc = this.peers.get(userId)
    if (!pc) {
      pc = this.createPeerConnection(userId)
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  }

  /**
   * Handle a received SDP answer from a remote user.
   */
  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(userId)
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  /**
   * Handle a received ICE candidate from a remote user.
   */
  async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(userId)
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  /**
   * Toggle mute on the local audio stream. Returns true if now muted.
   */
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return !audioTrack.enabled
      }
    }
    return false
  }

  /**
   * Check if currently muted.
   */
  isMuted(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        return !audioTrack.enabled
      }
    }
    return false
  }

  /**
   * Clean up all peer connections and release the local media stream.
   */
  cleanup(): void {
    this.peers.forEach((pc) => pc.close())
    this.peers.clear()

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    this.onIceCandidateCb = null
    this.onTrackCb = null
  }
}

// Export a singleton instance
export const webrtcService = new WebRTCService()
export default webrtcService
