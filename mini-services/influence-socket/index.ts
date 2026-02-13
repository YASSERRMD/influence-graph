/**
 * Influence Graph Platform - Socket.io Real-time Service
 * Port: 3003
 * 
 * Handles real-time influence updates, graph changes, and notifications
 */

import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";

const PORT = 3003;

// Types for the influence graph
interface InfluenceUpdate {
  type: 'EDGE_CREATED' | 'EDGE_UPDATED' | 'EDGE_DELETED' | 'SCORE_UPDATED';
  organizationId: string;
  data: unknown;
  timestamp: Date;
}

interface GraphUpdate {
  organizationId: string;
  nodes: unknown[];
  edges: unknown[];
}

interface RoomSubscription {
  organizationId: string;
  userId?: string;
}

// In-memory cache for the service
const roomCache = new Map<string, Set<string>>();

// Create HTTP server
const httpServer = new HttpServer();

// Create Socket.IO server with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware for authentication (simplified for demo)
io.use((socket: Socket, next) => {
  const organizationId = socket.handshake.auth.organizationId;
  const userId = socket.handshake.auth.userId;
  
  if (!organizationId) {
    return next(new Error("Organization ID required"));
  }
  
  // Attach user info to socket
  socket.data.organizationId = organizationId;
  socket.data.userId = userId;
  
  next();
});

// Connection handler
io.on("connection", (socket: Socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  const organizationId = socket.data.organizationId as string;
  const userId = socket.data.userId as string;
  
  // Join organization room
  const orgRoom = `org:${organizationId}`;
  socket.join(orgRoom);
  
  // Track room membership
  if (!roomCache.has(orgRoom)) {
    roomCache.set(orgRoom, new Set());
  }
  roomCache.get(orgRoom)!.add(socket.id);
  
  console.log(`[Socket] User ${userId} joined room ${orgRoom}`);
  
  // Send welcome message with current state
  socket.emit("connected", {
    message: "Connected to Influence Graph real-time service",
    organizationId,
    socketId: socket.id,
    timestamp: new Date()
  });

  // ========== ORGANIZATION ROOM EVENTS ==========
  
  // Join specific department room
  socket.on("join:department", (departmentId: string) => {
    const deptRoom = `dept:${organizationId}:${departmentId}`;
    socket.join(deptRoom);
    console.log(`[Socket] User joined department: ${departmentId}`);
    socket.emit("joined:department", { departmentId });
  });

  // Leave department room
  socket.on("leave:department", (departmentId: string) => {
    const deptRoom = `dept:${organizationId}:${departmentId}`;
    socket.leave(deptRoom);
    socket.emit("left:department", { departmentId });
  });

  // ========== INFLUENCE GRAPH EVENTS ==========

  // Broadcast influence edge creation
  socket.on("influence:edge:create", (data: { sourceUserId: string; targetUserId: string; weight: number }) => {
    console.log(`[Socket] Influence edge created: ${data.sourceUserId} -> ${data.targetUserId}`);
    
    const update: InfluenceUpdate = {
      type: 'EDGE_CREATED',
      organizationId,
      data,
      timestamp: new Date()
    };
    
    // Broadcast to all users in the organization
    io.to(orgRoom).emit("influence:update", update);
  });

  // Broadcast influence edge update
  socket.on("influence:edge:update", (data: { edgeId: string; weight: number; context?: string }) => {
    console.log(`[Socket] Influence edge updated: ${data.edgeId}`);
    
    const update: InfluenceUpdate = {
      type: 'EDGE_UPDATED',
      organizationId,
      data,
      timestamp: new Date()
    };
    
    io.to(orgRoom).emit("influence:update", update);
  });

  // Broadcast influence edge deletion
  socket.on("influence:edge:delete", (data: { edgeId: string }) => {
    console.log(`[Socket] Influence edge deleted: ${data.edgeId}`);
    
    const update: InfluenceUpdate = {
      type: 'EDGE_DELETED',
      organizationId,
      data,
      timestamp: new Date()
    };
    
    io.to(orgRoom).emit("influence:update", update);
  });

  // Broadcast score update
  socket.on("influence:score:update", (data: { userId: string; score: number; rank?: number }) => {
    console.log(`[Socket] Influence score updated for user: ${data.userId}`);
    
    const update: InfluenceUpdate = {
      type: 'SCORE_UPDATED',
      organizationId,
      data,
      timestamp: new Date()
    };
    
    io.to(orgRoom).emit("influence:update", update);
  });

  // ========== GRAPH VISUALIZATION EVENTS ==========

  // Request full graph sync
  socket.on("graph:sync:request", () => {
    console.log(`[Socket] Graph sync requested for org: ${organizationId}`);
    
    // This would typically fetch from the main API
    // For now, we just acknowledge the request
    socket.emit("graph:sync:ack", {
      organizationId,
      timestamp: new Date()
    });
  });

  // Broadcast graph updates
  socket.on("graph:broadcast", (data: GraphUpdate) => {
    if (data.organizationId === organizationId) {
      io.to(orgRoom).emit("graph:update", data);
    }
  });

  // ========== ANALYTICS EVENTS ==========

  // Broadcast analytics update
  socket.on("analytics:update", (data: { type: string; payload: unknown }) => {
    io.to(orgRoom).emit("analytics:refresh", data);
  });

  // ========== TIME REPLAY EVENTS ==========

  // Handle time-based replay requests
  socket.on("replay:request", (data: { startDate: Date; endDate: Date }) => {
    console.log(`[Socket] Replay requested: ${data.startDate} to ${data.endDate}`);
    
    // Acknowledge the request - actual data comes from API
    socket.emit("replay:ack", {
      startDate: data.startDate,
      endDate: data.endDate,
      timestamp: new Date()
    });
  });

  // ========== NOTIFICATION EVENTS ==========

  // Send notification to specific user
  socket.on("notification:send", (data: { targetUserId: string; message: string; type: string }) => {
    const userRoom = `user:${organizationId}:${data.targetUserId}`;
    io.to(userRoom).emit("notification:new", {
      message: data.message,
      type: data.type,
      timestamp: new Date()
    });
  });

  // ========== HEARTBEAT ==========

  // Handle heartbeat
  socket.on("heartbeat", () => {
    socket.emit("heartbeat:ack", { timestamp: new Date() });
  });

  // ========== DISCONNECT ==========

  socket.on("disconnect", (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
    
    // Clean up room cache
    const room = roomCache.get(orgRoom);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        roomCache.delete(orgRoom);
      }
    }
  });
});

// Periodic cleanup of stale connections
setInterval(() => {
  console.log(`[Socket] Active rooms: ${roomCache.size}`);
  roomCache.forEach((sockets, room) => {
    console.log(`[Socket] Room ${room}: ${sockets.size} connections`);
  });
}, 60000); // Every minute

// Start server
httpServer.listen(PORT, () => {
  console.log(`[Influence Socket Service] Running on port ${PORT}`);
  console.log(`[Socket] Ready for connections...`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Socket] SIGTERM received, shutting down...");
  io.close(() => {
    console.log("[Socket] Server closed");
    process.exit(0);
  });
});

export { io };
