// User profile and status management routes

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest, ApiResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All user routes require authentication
router.use(authMiddleware);

/**
 * GET /users/me
 * Returns the current authenticated user's profile.
 */
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: user,
    } as ApiResponse);
  } catch (error) {
    console.error('[USERS] Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    } as ApiResponse);
  }
});

/**
 * PUT /users/me
 * Updates the current user's profile fields (name, avatarUrl, bio, availabilityMode, doNotDisturb).
 */
router.put('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, avatarUrl, bio, availabilityMode, doNotDisturb } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bio !== undefined && { bio }),
        ...(availabilityMode !== undefined && { availabilityMode }),
        ...(doNotDisturb !== undefined && { doNotDisturb }),
      },
    });

    res.json({
      success: true,
      data: user,
    } as ApiResponse);
  } catch (error) {
    console.error('[USERS] Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile',
    } as ApiResponse);
  }
});

/**
 * PUT /users/me/status
 * Updates the current user's driving/availability status.
 * Also logs the status change in the activity log.
 */
router.put('/me/status', async (req: AuthRequest, res: Response): Promise<void> => {
  const { isAvailable, isDriving, availableUntil } = req.body;

  if (isAvailable === undefined && isDriving === undefined) {
    res.status(400).json({
      success: false,
      error: 'At least one of isAvailable or isDriving must be provided',
    } as ApiResponse);
    return;
  }

  try {
    const updateData: any = {};
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (isDriving !== undefined) updateData.isDriving = isDriving;
    if (availableUntil !== undefined) {
      updateData.availableUntil = availableUntil ? new Date(availableUntil) : null;
    }
    // Clear availableUntil when turning off
    if (isAvailable === false) updateData.availableUntil = null;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
    });

    // Log the availability change
    if (isAvailable !== undefined) {
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          eventType: isAvailable ? 'BECAME_AVAILABLE' : 'BECAME_UNAVAILABLE',
        },
      });
    }

    res.json({
      success: true,
      data: user,
    } as ApiResponse);
  } catch (error) {
    console.error('[USERS] Error updating status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
    } as ApiResponse);
  }
});

export default router;
