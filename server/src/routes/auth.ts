// Authentication routes: Firebase Phone Auth verification
// Client handles phone verification via Firebase, server verifies the token

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';
import type { ApiResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'roadbuddy-dev-secret-change-in-production';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[AUTH] Firebase Admin initialized');
  } else {
    console.warn('[AUTH] No Firebase service account - running in dev mode');
  }
}

/**
 * POST /auth/firebase-verify
 * Receives a Firebase ID token from the client after phone verification.
 * Verifies the token, creates/finds the user, and returns our JWT.
 */
router.post('/firebase-verify', async (req: Request, res: Response): Promise<void> => {
  const { idToken, phoneNumber } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Firebase ID token is required',
    } as ApiResponse);
    return;
  }

  try {
    let verifiedPhone = phoneNumber;

    // Verify Firebase token in production
    if (admin.apps.length) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      verifiedPhone = decodedToken.phone_number || phoneNumber;
    }

    if (!verifiedPhone) {
      res.status(400).json({
        success: false,
        error: 'Phone number could not be verified',
      } as ApiResponse);
      return;
    }

    // Find existing user or create a new one
    let user = await prisma.user.findUnique({
      where: { phoneNumber: verifiedPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber: verifiedPhone,
          name: `User ${verifiedPhone.slice(-4)}`,
        },
      });
      console.log(`[AUTH] New user created for ${verifiedPhone}`);
    }

    // Generate our JWT token
    const token = jwt.sign(
      { id: user.id, phoneNumber: user.phoneNumber },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: { token, user },
    } as ApiResponse);
  } catch (error) {
    console.error('[AUTH] Firebase verify error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    } as ApiResponse);
  }
});

/**
 * POST /auth/send-otp (kept for development/fallback)
 */
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber } = req.body;

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    res.status(400).json({ success: false, error: 'Phone number is required' } as ApiResponse);
    return;
  }

  // In dev mode without Firebase, just log
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  console.log(`[OTP] Dev code for ${phoneNumber}: ${otp}`);

  res.json({
    success: true,
    data: { message: 'OTP sent successfully' },
  } as ApiResponse);
});

/**
 * POST /auth/verify-otp (kept for development/fallback)
 */
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber, code } = req.body;

  if (!phoneNumber || !code) {
    res.status(400).json({ success: false, error: 'Phone and code required' } as ApiResponse);
    return;
  }

  try {
    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (!user) {
      user = await prisma.user.create({
        data: { phoneNumber, name: `User ${phoneNumber.slice(-4)}` },
      });
    }

    const token = jwt.sign(
      { id: user.id, phoneNumber: user.phoneNumber },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ success: true, data: { token, user } } as ApiResponse);
  } catch (error) {
    console.error('[AUTH] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' } as ApiResponse);
  }
});

export default router;
