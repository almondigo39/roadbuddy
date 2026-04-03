// Type definitions and Express request extensions for RoadBuddy

import { Request } from 'express';

/**
 * Authenticated user payload attached to requests after JWT verification.
 */
export interface AuthUser {
  id: string;
  phoneNumber: string;
}

/**
 * Extends Express Request to include the authenticated user.
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Standard API response format used across all endpoints.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Socket.io auth handshake payload.
 */
export interface SocketAuthPayload {
  token: string;
}

/**
 * Status update event payload for Socket.io.
 */
export interface StatusUpdatePayload {
  isAvailable: boolean;
  isDriving: boolean;
}

/**
 * Location update event payload for Socket.io.
 */
export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
}
