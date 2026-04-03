// Nudge routes: send a nudge notification to a friend

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();

// Socket.io server instance, injected from the main app setup
let io: SocketServer;

/**
 * Sets the Socket.io server instance for emitting nudge events.
 */
export const setSocketIO = (socketIO: SocketServer): void => {
  io = socketIO;
};

// All nudge routes require authentication
router.use(authMiddleware);

/**
 * POST /nudge/:friendId
 * Sends a nudge to a friend, logging the event and emitting a Socket.io notification.
 * A nudge is a gentle reminder that you'd like to talk.
 */
router.post('/:friendId', async (req: AuthRequest, res: Response): Promise<void> => {
  const friendId = req.params.friendId as string;

  try {
    // Verify the friendship exists and is accepted
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { userId: req.user!.id, friendId },
          { userId: friendId, friendId: req.user!.id },
        ],
      },
    });

    if (!friendship) {
      res.status(404).json({
        success: false,
        error: 'You can only nudge accepted friends',
      } as ApiResponse);
      return;
    }

    // Log the nudge in the activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        eventType: 'NUDGE_SENT',
        targetUserId: friendId,
      },
    });

    // Get the sender's info for the notification
    const sender = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, avatarUrl: true },
    });

    // Emit the nudge event to the target friend's Socket.io room
    if (io) {
      io.to(friendId).emit('nudge_received', {
        from: sender,
        message: `${sender?.name} nudged you!`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: { message: 'Nudge sent successfully' },
    } as ApiResponse);
  } catch (error) {
    console.error('[NUDGE] Error sending nudge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send nudge',
    } as ApiResponse);
  }
});

export default router;
