import { io, Socket } from 'socket.io-client'

// Socket.io client connection with auth token
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token')
    const serverUrl = import.meta.env.PROD ? 'https://roadbuddy-api-2jme.onrender.com' : 'http://localhost:3001'
    socket = io(serverUrl, {
      auth: { token },
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
