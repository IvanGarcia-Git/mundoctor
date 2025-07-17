import { Server } from 'socket.io';
import logger from './logger.js';

class WebSocketManager {
  constructor() {
    this.io = null;
    this.users = new Map(); // Map of userId to socket connections
    this.rooms = new Map(); // Map of roomId to users
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
          : [
              'http://localhost:5173', 
              'http://localhost:5174', 
              'http://localhost:3000',
              'http://127.0.0.1:5173',
              'http://127.0.0.1:5174',
              'http://127.0.0.1:3000'
            ],
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('WebSocket server initialized');
  }

  setupMiddleware() {
    // Authentication middleware for WebSocket
    this.io.use(async (socket, next) => {
      try {
        const userId = socket.handshake.auth.userId;
        const userRole = socket.handshake.auth.userRole;
        
        if (!userId) {
          return next(new Error('User ID required'));
        }

        // For now, we'll trust the frontend to send the correct userId and role
        // In production, you should verify this with Clerk or JWT tokens
        socket.userId = userId;
        socket.userRole = userRole || 'patient';
        
        logger.info(`User ${socket.userId} connected with role ${socket.userRole}`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      const userRole = socket.userRole;

      // Store user connection
      if (!this.users.has(userId)) {
        this.users.set(userId, new Set());
      }
      this.users.get(userId).add(socket);

      // Join role-based rooms
      socket.join(`role:${userRole}`);
      socket.join(`user:${userId}`);

      logger.info(`User ${userId} (${userRole}) connected via WebSocket`);

      // Handle joining specific rooms (e.g., appointment rooms)
      socket.on('join-room', (roomId) => {
        if (!roomId || typeof roomId !== 'string') {
          return socket.emit('error', { message: 'Invalid room ID' });
        }

        socket.join(roomId);
        
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(userId);
        
        logger.info(`User ${userId} joined room ${roomId}`);
        socket.emit('joined-room', { roomId });
      });

      // Handle leaving rooms
      socket.on('leave-room', (roomId) => {
        if (!roomId || typeof roomId !== 'string') {
          return socket.emit('error', { message: 'Invalid room ID' });
        }

        socket.leave(roomId);
        
        if (this.rooms.has(roomId)) {
          this.rooms.get(roomId).delete(userId);
          if (this.rooms.get(roomId).size === 0) {
            this.rooms.delete(roomId);
          }
        }
        
        logger.info(`User ${userId} left room ${roomId}`);
        socket.emit('left-room', { roomId });
      });

      // Handle typing indicators for chat
      socket.on('typing-start', (data) => {
        const { roomId } = data;
        if (roomId) {
          socket.to(roomId).emit('user-typing', { userId, userRole });
        }
      });

      socket.on('typing-stop', (data) => {
        const { roomId } = data;
        if (roomId) {
          socket.to(roomId).emit('user-stopped-typing', { userId });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`User ${userId} disconnected: ${reason}`);
        
        // Clean up user connections
        if (this.users.has(userId)) {
          this.users.get(userId).delete(socket);
          if (this.users.get(userId).size === 0) {
            this.users.delete(userId);
          }
        }

        // Clean up room memberships
        this.rooms.forEach((users, roomId) => {
          if (users.has(userId)) {
            users.delete(userId);
            if (users.size === 0) {
              this.rooms.delete(roomId);
            }
          }
        });
      });
    });
  }

  // Send notification to specific user
  sendToUser(userId, event, data) {
    if (!this.users.has(userId)) {
      logger.warn(`User ${userId} not connected, cannot send notification`);
      return false;
    }

    const userSockets = this.users.get(userId);
    userSockets.forEach(socket => {
      socket.emit(event, data);
    });

    logger.info(`Notification sent to user ${userId}: ${event}`);
    return true;
  }

  // Send notification to all users with specific role
  sendToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
    logger.info(`Notification sent to all ${role}s: ${event}`);
  }

  // Send notification to specific room
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
    logger.info(`Notification sent to room ${roomId}: ${event}`);
  }

  // Broadcast to all connected users
  broadcast(event, data) {
    this.io.emit(event, data);
    logger.info(`Broadcast sent: ${event}`);
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.users.size;
  }

  // Get users in a specific room
  getRoomUsers(roomId) {
    return Array.from(this.rooms.get(roomId) || []);
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.users.has(userId);
  }

  // Get all online users by role
  getOnlineUsersByRole(role) {
    const onlineUsers = [];
    this.io.of('/').adapter.rooms.get(`role:${role}`)?.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket?.userId) {
        onlineUsers.push(socket.userId);
      }
    });
    return onlineUsers;
  }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

export default webSocketManager;