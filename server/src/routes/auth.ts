// Authentication routes: OTP send and verify flow
// For MVP, any 4-digit code is accepted during verification.

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'roadbuddy-dev-secret-change-in-production';

// In-memory store for OTP codes (phone -> code)
const otpStore = new Map<string, string>();

/**
 * POST /auth/send-otp
 * Generates a random 4-digit OTP for the given phone number.
 * Stores it in memory and logs it to the console for development.
 */
router.post('/send-otp', (req: Request, res: Response): void => {
  const { phoneNumber } = req.body;

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Phone number is required',
    } as ApiResponse);
    return;
  }

  // Generate a random 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore.set(phoneNumber, otp);

  // Log OTP to console for development purposes
  console.log(`[OTP] Code for ${phoneNumber}: ${otp}`);

  res.json({
    success: true,
    data: { message: 'OTP sent successfully' },
  } as ApiResponse);
});

/**
 * POST /auth/verify-otp
 * Verifies the OTP code for a phone number.
 * For MVP: accepts ANY 4-digit code.
 * Creates a new user if one doesn't exist for the phone number.
 * Returns a JWT token on success.
 */
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber, code } = req.body;

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Phone number is required',
    } as ApiResponse);
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      success: false,
      error: 'OTP code is required',
    } as ApiResponse);
    return;
  }

  // For MVP: accept any 4-digit code
  if (!/^\d{4}$/.test(code)) {
    res.status(400).json({
      success: false,
      error: 'OTP must be a 4-digit code',
    } as ApiResponse);
    return;
  }

  try {
    // Find existing user or create a new one
    let user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          name: `User ${phoneNumber.slice(-4)}`, // Default name from last 4 digits
        },
      });
      console.log(`[AUTH] New user created for ${phoneNumber}`);
    }

    // Clear the OTP from memory
    otpStore.delete(phoneNumber);

    // Generate JWT token
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
    console.error('[AUTH] Error during OTP verification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    } as ApiResponse);
  }
});

export default router;
