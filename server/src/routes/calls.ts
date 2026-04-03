// Call management routes: start, join, leave, and list active calls

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
 * Sets the Socket.io server instance for emitting call events.
 */
export const setCallSocketIO = (socketIO: SocketServer): void => {
  io = socketIO;
};

// All call routes require authentication
router.use(authMiddleware);

/**
 * POST /api/calls/start
 * Start a new call with the given participants.
 */
router.post('/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { participants } = req.body as { participants: string[] };
    const userId = req.user!.id;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one participant is required',
      } as ApiResponse);
      return;
    }

    if (participants.length > 4) {
      res.status(400).json({
        success: false,
        error: 'Maximum 5 participants (including yourself) allowed',
      } as ApiResponse);
      return;
    }

    // Create the call record with participants
    const call = await prisma.call.create({
      data: {
        startedBy: userId,
        participants: {
          create: [
            { userId },
            ...participants.map((pid: string) => ({ userId: pid })),
          ],
        },
      },
      include: { participants: true },
    });

    // Get caller info
    const caller = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });

    // Notify each invited participant via socket
    if (io) {
      participants.forEach((pid: string) => {
        io.to(pid).emit('call_incoming', {
          callId: call.id,
          from: caller,
          participants: [userId, ...participants],
        });
      });
    }

    res.json({
      success: true,
      data: { callId: call.id, participants: call.participants },
    } as ApiResponse);
  } catch (error) {
    console.error('[CALLS] Error starting call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start call',
    } as ApiResponse);
  }
});

/**
 * POST /api/calls/:callId/join
 * Join an existing active call.
 */
router.post('/:callId/join', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const callId = req.params.callId as string;
    const userId = req.user!.id;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { participants: true },
    });

    if (!call || call.status !== 'ACTIVE') {
      res.status(404).json({
        success: false,
        error: 'Call not found or already ended',
      } as ApiResponse);
      return;
    }

    // Check if user is already a participant
    const existing = call.participants.find((p: { userId: string; leftAt: Date | null }) => p.userId === userId);
    if (existing && !existing.leftAt) {
      res.json({ success: true, data: { callId, message: 'Already in call' } } as ApiResponse);
      return;
    }

    if (existing && existing.leftAt) {
      // Rejoin
      await prisma.callParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null, joinedAt: new Date() },
      });
    } else {
      // New participant
      await prisma.callParticipant.create({
        data: { callId, userId },
      });
    }

    // Get user info for notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // Notify other participants
    if (io) {
      call.participants.forEach((p: { userId: string; leftAt: Date | null }) => {
        if (p.userId !== userId && !p.leftAt) {
          io.to(p.userId).emit('call_user_joined', {
            callId,
            userId,
            name: user?.name,
          });
        }
      });
    }

    res.json({ success: true, data: { callId } } as ApiResponse);
  } catch (error) {
    console.error('[CALLS] Error joining call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join call',
    } as ApiResponse);
  }
});

/**
 * POST /api/calls/:callId/leave
 * Leave a call. If all participants have left, end the call.
 */
router.post('/:callId/leave', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const callId = req.params.callId as string;
    const userId = req.user!.id;

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { participants: true },
    });

    if (!call || call.status !== 'ACTIVE') {
      res.status(404).json({
        success: false,
        error: 'Call not found or already ended',
      } as ApiResponse);
      return;
    }

    // Mark the user as left
    await prisma.callParticipant.updateMany({
      where: { callId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });

    // Check if any active participants remain
    const activeParticipants = call.participants.filter(
      (p: { userId: string; leftAt: Date | null }) => p.userId !== userId && !p.leftAt
    );

    if (activeParticipants.length <= 1) {
      // End the call if 1 or fewer people remain
      await prisma.call.update({
        where: { id: callId },
        data: { status: 'ENDED', endedAt: new Date() },
      });

      // Mark remaining participants as left
      await prisma.callParticipant.updateMany({
        where: { callId, leftAt: null },
        data: { leftAt: new Date() },
      });

      // Notify everyone the call ended
      if (io) {
        call.participants.forEach((p: { userId: string }) => {
          io.to(p.userId).emit('call_ended', { callId });
        });
      }
    } else {
      // Notify remaining participants that user left
      if (io) {
        activeParticipants.forEach((p: { userId: string }) => {
          io.to(p.userId).emit('call_user_left', { callId, userId });
        });
      }
    }

    res.json({ success: true, data: { callId } } as ApiResponse);
  } catch (error) {
    console.error('[CALLS] Error leaving call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave call',
    } as ApiResponse);
  }
});

/**
 * GET /api/calls/active
 * Get the user's currently active call, if any.
 */
router.get('/active', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const activeParticipation = await prisma.callParticipant.findFirst({
      where: { userId, leftAt: null, call: { status: 'ACTIVE' } },
      include: {
        call: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!activeParticipation) {
      res.json({ success: true, data: null } as ApiResponse);
      return;
    }

    // Get participant user info
    const participantIds = activeParticipation.call.participants
      .filter((p: { leftAt: Date | null }) => !p.leftAt)
      .map((p: { userId: string }) => p.userId);

    const users = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, name: true, avatarUrl: true },
    });

    res.json({
      success: true,
      data: {
        callId: activeParticipation.call.id,
        participants: users,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('[CALLS] Error fetching active call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active call',
    } as ApiResponse);
  }
});

export default router;
