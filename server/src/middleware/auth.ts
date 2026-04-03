// JWT authentication middleware for protecting routes

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'roadbuddy-dev-secret-change-in-production';

/**
 * Middleware that verifies JWT tokens from the Authorization header.
 * Attaches the decoded user payload to req.user on success.
 * Returns 401 if no token is provided or the token is invalid.
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No authentication token provided',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};
