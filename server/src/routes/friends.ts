// Friend management routes: request, accept, block, list, and delete friendships

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All friend routes require authentication
router.use(authMiddleware);

/**
 * POST /friends/request
 * Send a friend request to another user by phone number.
 */
router.post('/request', async (req: AuthRequest, res: Response): Promise<void> => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400).json({
      success: false,
      error: 'Phone number is required',
    } as ApiResponse);
    return;
  }

  try {
    // Find the target user by phone number
    const targetUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: 'User with this phone number not found',
      } as ApiResponse);
      return;
    }

    // Prevent sending a friend request to yourself
    if (targetUser.id === req.user!.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot send a friend request to yourself',
      } as ApiResponse);
      return;
    }

    // Check if a friendship already exists in either direction
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.user!.id, friendId: targetUser.id },
          { userId: targetUser.id, friendId: req.user!.id },
        ],
      },
    });

    if (existingFriendship) {
      res.status(400).json({
        success: false,
        error: 'A friendship or request already exists with this user',
      } as ApiResponse);
      return;
    }

    // Create the friend request
    const friendship = await prisma.friendship.create({
      data: {
        userId: req.user!.id,
        friendId: targetUser.id,
        status: 'PENDING',
      },
      include: {
        friend: {
          select: { id: true, name: true, phoneNumber: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: friendship,
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error sending friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send friend request',
    } as ApiResponse);
  }
});

/**
 * PUT /friends/:id/accept
 * Accept a pending friend request.
 */
router.put('/:id/accept', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    // Only the recipient of the friend request can accept it
    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        friendId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!friendship) {
      res.status(404).json({
        success: false,
        error: 'Pending friend request not found',
      } as ApiResponse);
      return;
    }

    const updated = await prisma.friendship.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      include: {
        user: {
          select: { id: true, name: true, phoneNumber: true, avatarUrl: true },
        },
        friend: {
          select: { id: true, name: true, phoneNumber: true, avatarUrl: true },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error accepting friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept friend request',
    } as ApiResponse);
  }
});

/**
 * PUT /friends/:id/block
 * Block a user by updating the friendship status.
 */
router.put('/:id/block', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    // Verify the friendship involves the current user
    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user!.id },
          { friendId: req.user!.id },
        ],
      },
    });

    if (!friendship) {
      res.status(404).json({
        success: false,
        error: 'Friendship not found',
      } as ApiResponse);
      return;
    }

    const updated = await prisma.friendship.update({
      where: { id },
      data: { status: 'BLOCKED' },
    });

    res.json({
      success: true,
      data: updated,
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error blocking user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block user',
    } as ApiResponse);
  }
});

/**
 * GET /friends/requests
 * List pending friend requests received by the current user.
 */
router.get('/requests', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pendingRequests = await prisma.friendship.findMany({
      where: {
        friendId: req.user!.id,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, phoneNumber: true, avatarUrl: true },
        },
      },
    });

    const formatted = pendingRequests.map((r) => ({
      id: r.id,
      from: r.user,
    }));

    res.json({
      success: true,
      data: formatted,
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error listing friend requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list friend requests',
    } as ApiResponse);
  }
});

/**
 * DELETE /friends/requests/:id
 * Decline (delete) a pending friend request.
 */
router.delete('/requests/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        friendId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!friendship) {
      res.status(404).json({
        success: false,
        error: 'Pending friend request not found',
      } as ApiResponse);
      return;
    }

    await prisma.friendship.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Friend request declined' },
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error declining friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline friend request',
    } as ApiResponse);
  }
});

/**
 * GET /friends
 * List all accepted friends for the current user.
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: req.user!.id, status: 'ACCEPTED' },
          { friendId: req.user!.id, status: 'ACCEPTED' },
        ],
      },
      include: {
        user: {
          select: {
            id: true, name: true, phoneNumber: true, avatarUrl: true,
            isAvailable: true, isDriving: true, doNotDisturb: true,
          },
        },
        friend: {
          select: {
            id: true, name: true, phoneNumber: true, avatarUrl: true,
            isAvailable: true, isDriving: true, doNotDisturb: true,
          },
        },
      },
    });

    // Map friendships so the "friend" field always points to the other user
    const friends = friendships.map((f) => {
      const friendData = f.userId === req.user!.id ? f.friend : f.user;
      return {
        friendshipId: f.id,
        isFavorite: f.isFavorite,
        ...friendData,
      };
    });

    res.json({
      success: true,
      data: friends,
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error listing friends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list friends',
    } as ApiResponse);
  }
});

/**
 * GET /friends/available
 * List friends who are currently available for a call.
 */
router.get('/available', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: req.user!.id, status: 'ACCEPTED' },
          { friendId: req.user!.id, status: 'ACCEPTED' },
        ],
      },
      include: {
        user: {
          select: {
            id: true, name: true, phoneNumber: true, avatarUrl: true,
            isAvailable: true, isDriving: true, doNotDisturb: true,
          },
        },
        friend: {
          select: {
            id: true, name: true, phoneNumber: true, avatarUrl: true,
            isAvailable: true, isDriving: true, doNotDisturb: true,
          },
        },
      },
    });

    // Filter to only friends who are available and not in Do Not Disturb mode
    const availableFriends = friendships
      .map((f) => {
        const friendData = f.userId === req.user!.id ? f.friend : f.user;
        return {
          friendshipId: f.id,
          isFavorite: f.isFavorite,
          ...friendData,
        };
      })
      .filter((friend) => friend.isAvailable && !friend.doNotDisturb);

    res.json({
      success: true,
      data: availableFriends,
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error listing available friends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list available friends',
    } as ApiResponse);
  }
});

/**
 * DELETE /friends/:id
 * Remove a friendship entirely.
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;

  try {
    // Verify the friendship involves the current user
    const friendship = await prisma.friendship.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user!.id },
          { friendId: req.user!.id },
        ],
      },
    });

    if (!friendship) {
      res.status(404).json({
        success: false,
        error: 'Friendship not found',
      } as ApiResponse);
      return;
    }

    await prisma.friendship.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Friendship removed' },
    } as ApiResponse);
  } catch (error) {
    console.error('[FRIENDS] Error deleting friendship:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete friendship',
    } as ApiResponse);
  }
});

export default router;
