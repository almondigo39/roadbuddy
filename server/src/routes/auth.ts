// Authentication routes: OTP send and verify flow
// Uses Twilio Verify API in production, console log in development

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';
import type { ApiResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'roadbuddy-dev-secret-change-in-production';

// Twilio Verify setup
const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SID;

// In-memory store for OTP codes - used only in development
const otpStore = new Map<string, string>();

/**
 * POST /auth/send-otp
 * Sends OTP via Twilio Verify in production, logs to console in development.
 */
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber } = req.body;

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Phone number is required',
    } as ApiResponse);
    return;
  }

  // Use Twilio Verify API in production
  if (twilioClient && VERIFY_SERVICE_SID) {
    try {
      await twilioClient.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms',
        });
      console.log(`[OTP] Verification SMS sent to ${phoneNumber}`);
    } catch (error) {
      console.error('[OTP] Twilio Verify error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send SMS. Please try again.',
      } as ApiResponse);
      return;
    }
  } else {
    // Development mode - generate and log OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(phoneNumber, otp);
    console.log(`[OTP] Code for ${phoneNumber}: ${otp}`);
  }

  res.json({
    success: true,
    data: { message: 'OTP sent successfully' },
  } as ApiResponse);
});

/**
 * POST /auth/verify-otp
 * Verifies the OTP code via Twilio Verify in production.
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

  // Verify OTP via Twilio Verify API or local store
  if (twilioClient && VERIFY_SERVICE_SID) {
    try {
      const check = await twilioClient.verify.v2
        .services(VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phoneNumber,
          code: code,
        });

      if (check.status !== 'approved') {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired verification code',
        } as ApiResponse);
        return;
      }
    } catch (error) {
      console.error('[OTP] Twilio Verify check error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired verification code',
      } as ApiResponse);
      return;
    }
  } else {
    // Development mode - check local store
    const storedOtp = otpStore.get(phoneNumber);
    if (!storedOtp || storedOtp !== code) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired verification code',
      } as ApiResponse);
      return;
    }
    otpStore.delete(phoneNumber);
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
