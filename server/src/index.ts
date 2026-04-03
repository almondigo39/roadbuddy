// RoadBuddy Server - Main entry point
// Express app with Socket.io for real-time status updates

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initializeSocket } from './socket';
import { setSocketIO } from './routes/nudge';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import friendRoutes from './routes/friends';
import nudgeRoutes from './routes/nudge';
import callRoutes from './routes/calls';
import { setCallSocketIO } from './routes/calls';

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server for both Express and Socket.io
const httpServer = createServer(app);

// Initialize Socket.io and share the instance with the nudge routes
const io = initializeSocket(httpServer);
setSocketIO(io);
setCallSocketIO(io);

// Global middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Mount API routes under /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/nudge', nudgeRoutes);
app.use('/api/calls', callRoutes);

// Start the server
httpServer.listen(PORT, () => {
  console.log(`[SERVER] RoadBuddy backend running on port ${PORT}`);
  console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);
});

export default app;
