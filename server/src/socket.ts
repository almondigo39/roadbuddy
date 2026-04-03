// Socket.io setup: real-time communication for status updates and notifications

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthUser, StatusUpdatePayload, LocationUpdatePayload } from './types';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'roadbuddy-dev-secret-change-in-production';

/**
 * Initializes Socket.io on the given HTTP server.
 * Handles authentication, status updates, location updates, and disconnect events.
 */
export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate socket connections using JWT from the handshake
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      // Attach user data to the socket for later use
      (socket as any).user = decoded;
      next();
    } catch (error) {
      return next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthUser;
    console.log(`[SOCKET] User connected: ${user.id}`);

    // Join the user to their own room so we can send targeted events
    socket.join(user.id);

    /**
     * Handle status updates (availability and driving state).
     * When a user's status changes, notify all their accepted friends.
     */
    socket.on('status_update', async (payload: StatusUpdatePayload) => {
      try {
        const { isAvailable, isDriving } = payload;

        // Update the user's status in the database
        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(isAvailable !== undefined && { isAvailable }),
            ...(isDriving !== undefined && { isDriving }),
          },
        });

        // Log the availability change
        if (isAvailable !== undefined) {
          await prisma.activityLog.create({
            data: {
              userId: user.id,
              eventType: isAvailable ? 'BECAME_AVAILABLE' : 'BECAME_UNAVAILABLE',
            },
          });
        }

        // Get the user's accepted friends to notify them
        const friendships = await prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [
              { userId: user.id },
              { friendId: user.id },
            ],
          },
        });

        // Get the updated user data to broadcast
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            name: true,
            isAvailable: true,
            isDriving: true,
            doNotDisturb: true,
          },
        });

        // Notify each friend about the status change
        const eventName = isAvailable ? 'friend_available' : 'friend_unavailable';
        friendships.forEach((friendship) => {
          const friendUserId = friendship.userId === user.id
            ? friendship.friendId
            : friendship.userId;
          io.to(friendUserId).emit(eventName, updatedUser);
        });

        console.log(`[SOCKET] Status update for user ${user.id}: available=${isAvailable}, driving=${isDriving}`);
      } catch (error) {
        console.error('[SOCKET] Error handling status update:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    /**
     * Handle location updates from driving users.
     * Updates the lastLocationUpdate timestamp in the database.
     */
    socket.on('location_update', async (payload: LocationUpdatePayload) => {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLocationUpdate: new Date() },
        });

        console.log(`[SOCKET] Location update for user ${user.id}: lat=${payload.latitude}, lng=${payload.longitude}`);
      } catch (error) {
        console.error('[SOCKET] Error handling location update:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // --- WebRTC signaling events ---

    /**
     * Handle call invite: notify target users of an incoming call.
     */
    socket.on('call_invite', async (payload: { callId: string; targetUserIds: string[] }) => {
      try {
        const caller = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, name: true, avatarUrl: true },
        });

        payload.targetUserIds.forEach((targetId: string) => {
          io.to(targetId).emit('call_incoming', {
            callId: payload.callId,
            from: caller,
            participants: payload.targetUserIds,
          });
        });

        console.log(`[SOCKET] Call invite from ${user.id} to ${payload.targetUserIds.join(', ')}`);
      } catch (error) {
        console.error('[SOCKET] Error handling call invite:', error);
      }
    });

    /**
     * Handle call acceptance: notify the caller that a user accepted.
     */
    socket.on('call_accept', async (payload: { callId: string }) => {
      try {
        const call = await prisma.call.findUnique({
          where: { id: payload.callId },
          include: { participants: true },
        });

        if (call) {
          call.participants.forEach((p) => {
            if (p.userId !== user.id && !p.leftAt) {
              io.to(p.userId).emit('call_accepted', {
                callId: payload.callId,
                userId: user.id,
              });
            }
          });
        }

        console.log(`[SOCKET] Call accepted by ${user.id} for call ${payload.callId}`);
      } catch (error) {
        console.error('[SOCKET] Error handling call accept:', error);
      }
    });

    /**
     * Handle call rejection: notify other participants.
     */
    socket.on('call_reject', async (payload: { callId: string }) => {
      try {
        const call = await prisma.call.findUnique({
          where: { id: payload.callId },
          include: { participants: true },
        });

        if (call) {
          call.participants.forEach((p) => {
            if (p.userId !== user.id && !p.leftAt) {
              io.to(p.userId).emit('call_rejected', {
                callId: payload.callId,
                userId: user.id,
              });
            }
          });
        }

        console.log(`[SOCKET] Call rejected by ${user.id} for call ${payload.callId}`);
      } catch (error) {
        console.error('[SOCKET] Error handling call reject:', error);
      }
    });

    /**
     * Handle call end: notify all participants the call has ended.
     */
    socket.on('call_end', async (payload: { callId: string }) => {
      try {
        const call = await prisma.call.findUnique({
          where: { id: payload.callId },
          include: { participants: true },
        });

        if (call) {
          call.participants.forEach((p) => {
            if (p.userId !== user.id) {
              io.to(p.userId).emit('call_ended', { callId: payload.callId });
            }
          });
        }

        console.log(`[SOCKET] Call ended by ${user.id} for call ${payload.callId}`);
      } catch (error) {
        console.error('[SOCKET] Error handling call end:', error);
      }
    });

    /**
     * Relay WebRTC SDP offer to the target user.
     */
    socket.on('webrtc_offer', (payload: { callId: string; targetUserId: string; offer: any }) => {
      io.to(payload.targetUserId).emit('webrtc_offer', {
        callId: payload.callId,
        fromUserId: user.id,
        offer: payload.offer,
      });
      console.log(`[SOCKET] WebRTC offer from ${user.id} to ${payload.targetUserId}`);
    });

    /**
     * Relay WebRTC SDP answer to the target user.
     */
    socket.on('webrtc_answer', (payload: { callId: string; targetUserId: string; answer: any }) => {
      io.to(payload.targetUserId).emit('webrtc_answer', {
        callId: payload.callId,
        fromUserId: user.id,
        answer: payload.answer,
      });
      console.log(`[SOCKET] WebRTC answer from ${user.id} to ${payload.targetUserId}`);
    });

    /**
     * Relay ICE candidate to the target user.
     */
    socket.on('webrtc_ice', (payload: { callId: string; targetUserId: string; candidate: any }) => {
      io.to(payload.targetUserId).emit('webrtc_ice', {
        callId: payload.callId,
        fromUserId: user.id,
        candidate: payload.candidate,
      });
    });

    /**
     * Handle graceful disconnection.
     * Optionally mark the user as unavailable on disconnect.
     */
    socket.on('disconnect', async () => {
      console.log(`[SOCKET] User disconnected: ${user.id}`);

      try {
        // Mark user as unavailable when they disconnect
        await prisma.user.update({
          where: { id: user.id },
          data: { isAvailable: false },
        });

        // Notify friends that this user is no longer available
        const friendships = await prisma.friendship.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [
              { userId: user.id },
              { friendId: user.id },
            ],
          },
        });

        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, name: true, isAvailable: true, isDriving: true, doNotDisturb: true },
        });

        friendships.forEach((friendship) => {
          const friendUserId = friendship.userId === user.id
            ? friendship.friendId
            : friendship.userId;
          io.to(friendUserId).emit('friend_unavailable', updatedUser);
        });
      } catch (error) {
        console.error('[SOCKET] Error handling disconnect:', error);
      }
    });
  });

  return io;
};
