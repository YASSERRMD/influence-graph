/**
 * Socket.io Client Hook for Influence Graph
 * 
 * Provides real-time updates for influence graph changes.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

interface SocketState {
  connected: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

interface UseInfluenceSocketOptions {
  organizationId: string;
  userId?: string;
  onInfluenceUpdate?: (update: InfluenceUpdate) => void;
  onGraphUpdate?: (update: GraphUpdate) => void;
  onNotification?: (notification: { message: string; type: string; timestamp: Date }) => void;
}

export function useInfluenceSocket({
  organizationId,
  userId,
  onInfluenceUpdate,
  onGraphUpdate,
  onNotification
}: UseInfluenceSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({ onInfluenceUpdate, onGraphUpdate, onNotification });
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
    lastUpdate: null
  });

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = { onInfluenceUpdate, onGraphUpdate, onNotification };
  }, [onInfluenceUpdate, onGraphUpdate, onNotification]);

  // Initialize socket connection only when organizationId is available
  useEffect(() => {
    // Don't connect without a valid organizationId
    if (!organizationId) {
      return;
    }

    // Prevent double connection in React strict mode
    if (socketRef.current) {
      return;
    }

    const socket = io({
      path: '/socket.io',
      query: {
        XTransformPort: 3003
      },
      auth: {
        organizationId,
        userId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setState(prev => ({ ...prev, connected: true, error: null }));
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setState(prev => ({ ...prev, connected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    });

    socket.on('connected', (data) => {
      console.log('[Socket] Server acknowledged connection:', data);
    });

    // Influence update events
    socket.on('influence:update', (update: InfluenceUpdate) => {
      console.log('[Socket] Influence update:', update);
      setState(prev => ({ ...prev, lastUpdate: new Date() }));
      callbacksRef.current.onInfluenceUpdate?.(update);
    });

    // Graph update events
    socket.on('graph:update', (update: GraphUpdate) => {
      console.log('[Socket] Graph update:', update);
      setState(prev => ({ ...prev, lastUpdate: new Date() }));
      callbacksRef.current.onGraphUpdate?.(update);
    });

    // Notification events
    socket.on('notification:new', (notification) => {
      console.log('[Socket] Notification:', notification);
      callbacksRef.current.onNotification?.(notification);
    });

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat');
    }, 30000);

    return () => {
      console.log('[Socket] Cleaning up socket connection');
      clearInterval(heartbeatInterval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [organizationId, userId]); // Only depend on organizationId and userId

  // Emit influence edge creation
  const createEdge = useCallback((data: {
    sourceUserId: string;
    targetUserId: string;
    weight: number;
  }) => {
    socketRef.current?.emit('influence:edge:create', data);
  }, []);

  // Emit influence edge update
  const updateEdge = useCallback((data: {
    edgeId: string;
    weight: number;
    context?: string;
  }) => {
    socketRef.current?.emit('influence:edge:update', data);
  }, []);

  // Emit influence edge deletion
  const deleteEdge = useCallback((edgeId: string) => {
    socketRef.current?.emit('influence:edge:delete', { edgeId });
  }, []);

  // Request graph sync
  const requestSync = useCallback(() => {
    socketRef.current?.emit('graph:sync:request');
  }, []);

  // Join department room
  const joinDepartment = useCallback((departmentId: string) => {
    socketRef.current?.emit('join:department', departmentId);
  }, []);

  // Leave department room
  const leaveDepartment = useCallback((departmentId: string) => {
    socketRef.current?.emit('leave:department', departmentId);
  }, []);

  return {
    ...state,
    createEdge,
    updateEdge,
    deleteEdge,
    requestSync,
    joinDepartment,
    leaveDepartment
  };
}

export default useInfluenceSocket;
