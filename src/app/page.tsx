'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Network, Users, TrendingUp, Activity, BarChart3,
  RefreshCw, Plus, Play, Pause, SkipBack, SkipForward,
  Zap, Clock, Building2, User, Link2,
  Target, Award, PieChart, LineChart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInfluenceSocket } from '@/hooks/use-influence-socket';
import { ThemeToggle } from '@/components/theme-toggle';

// Types
interface GraphNode {
  id: string;
  name: string;
  email: string;
  department?: { id: string; name: string; code: string };
  score: number;
  rawScore: number;
  volatility: number;
  rank: number | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  decayedWeight: number;
  context?: string;
  contextType?: string;
  sourceUser: { id: string; name: string; email: string };
  targetUser: { id: string; name: string; email: string };
  createdAt: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: {
    totalNodes: number;
    totalEdges: number;
    lastUpdated: string;
  };
}

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalEdges: number;
    totalDepartments: number;
    totalInfluence: number;
    averageInfluence: number;
  };
  topInfluencers: Array<{
    id: string;
    name: string;
    department?: string;
    score: number;
  }>;
  departmentBreakdown: Array<{
    id: string;
    name: string;
    code: string;
    userCount: number;
    totalInfluence: number;
    avgInfluence: number;
    internalEdges: number;
    externalEdges: number;
  }>;
}

// Department colors
const DEPT_COLORS: Record<string, string> = {
  'EXEC': '#ef4444',
  'ENG': '#3b82f6',
  'PROD': '#22c55e',
  'DATA': '#06b6d4',
  'DESIGN': '#ec4899',
  'SALES': '#f59e0b',
  'MKTG': '#8b5cf6',
  'HR': '#14b8a6',
  'FIN': '#64748b',
  'OPS': '#84cc16',
};

// Force-directed graph simulation with drag support
function useForceGraph(nodes: GraphNode[], edges: GraphEdge[]) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; vx: number; vy: number; fx: number | null; fy: number | null }>>(new Map());
  const animationRef = useRef<number>();
  const nodesRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number; fx: number | null; fy: number | null }>>(new Map());
  const iterationRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Initialize positions with better spacing
    if (!initializedRef.current && nodes.length > 0) {
      const width = 900;
      const height = 700;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Group nodes by department for better layout
      const deptGroups = new Map<string, GraphNode[]>();
      nodes.forEach(node => {
        const dept = node.department?.code || 'OTHER';
        if (!deptGroups.has(dept)) deptGroups.set(dept, []);
        deptGroups.get(dept)!.push(node);
      });

      // Position each department in a cluster
      const deptCount = deptGroups.size;
      let deptIndex = 0;
      
      deptGroups.forEach((deptNodes, dept) => {
        const deptAngle = (2 * Math.PI * deptIndex) / deptCount;
        const deptRadius = Math.min(width, height) * 0.35;
        const deptCenterX = centerX + deptRadius * Math.cos(deptAngle);
        const deptCenterY = centerY + deptRadius * Math.sin(deptAngle);
        
        // Position nodes within department
        deptNodes.forEach((node, i) => {
          const nodeAngle = (2 * Math.PI * i) / deptNodes.length;
          const nodeRadius = 30 + (deptNodes.length * 8);
          nodesRef.current.set(node.id, {
            x: deptCenterX + nodeRadius * Math.cos(nodeAngle) + (Math.random() - 0.5) * 20,
            y: deptCenterY + nodeRadius * Math.sin(nodeAngle) + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: 0,
            fx: null,
            fy: null
          });
        });
        deptIndex++;
      });
      
      initializedRef.current = true;
      iterationRef.current = 0;
    }

    // Remove old nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const id of nodesRef.current.keys()) {
      if (!nodeIds.has(id)) {
        nodesRef.current.delete(id);
      }
    }

    // Force simulation with improved parameters
    const simulate = () => {
      const alpha = Math.max(0.001, 0.3 - iterationRef.current * 0.002);
      const k = 0.008;
      const repulsion = 8000;
      const centerForce = 0.005;
      const width = 900;
      const height = 700;

      // Apply forces
      for (const [id, node] of nodesRef.current) {
        if (node.fx !== null) continue; // Skip fixed (dragged) nodes

        // Center gravity (weak)
        node.vx -= (node.x - width / 2) * centerForce * alpha;
        node.vy -= (node.y - height / 2) * centerForce * alpha;

        // Node repulsion (stronger)
        for (const [otherId, other] of nodesRef.current) {
          if (id === otherId) continue;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Stronger repulsion at close range
          const minDist = 60;
          if (dist < minDist * 3) {
            const force = repulsion / (dist * dist) * alpha;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        }
      }

      // Edge attraction
      for (const edge of edges) {
        const source = nodesRef.current.get(edge.source);
        const target = nodesRef.current.get(edge.target);
        if (!source || !target) continue;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Ideal distance based on weight
        const idealDist = 100 + (100 - edge.weight);
        const force = (dist - idealDist) * k * alpha * (edge.weight / 50);
        
        if (source.fx === null) {
          source.vx += dx * force;
          source.vy += dy * force;
        }
        if (target.fx === null) {
          target.vx -= dx * force;
          target.vy -= dy * force;
        }
      }

      // Update positions with damping
      for (const [, node] of nodesRef.current) {
        if (node.fx !== null) {
          node.x = node.fx;
          node.y = node.fy;
          node.vx = 0;
          node.vy = 0;
          continue;
        }
        
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
        
        // Boundaries with padding
        node.x = Math.max(40, Math.min(width - 40, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      }

      setPositions(new Map(nodesRef.current));
      iterationRef.current++;
      
      // Continue simulation for first 300 iterations, then slow down
      if (iterationRef.current < 300) {
        animationRef.current = requestAnimationFrame(simulate);
      } else if (iterationRef.current < 500 && iterationRef.current % 3 === 0) {
        animationRef.current = requestAnimationFrame(simulate);
      }
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, edges]);

  // Function to drag a node
  const dragNode = useCallback((nodeId: string, x: number, y: number, isDragging: boolean) => {
    const node = nodesRef.current.get(nodeId);
    if (node) {
      if (isDragging) {
        node.fx = x;
        node.fy = y;
        node.x = x;
        node.y = y;
        node.vx = 0;
        node.vy = 0;
      } else {
        node.fx = null;
        node.fy = null;
        // Restart simulation briefly
        iterationRef.current = Math.max(iterationRef.current, 200);
      }
      setPositions(new Map(nodesRef.current));
    }
  }, []);

  // Function to restart simulation
  const restartSimulation = useCallback(() => {
    iterationRef.current = 0;
    for (const [, node] of nodesRef.current) {
      node.fx = null;
      node.fy = null;
    }
  }, []);

  return { positions, dragNode, restartSimulation };
}

// Graph Canvas Component
function InfluenceGraph({ data, selectedNode, onSelectNode, timeFilter }: {
  data: GraphData;
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
  timeFilter: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { positions, dragNode, restartSimulation } = useForceGraph(data.nodes, data.edges);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const width = 900;
  const height = 700;

  // Filter edges by time
  const filteredEdges = useMemo(() => {
    const cutoffDate = new Date(Date.now() - timeFilter * 24 * 60 * 60 * 1000);
    return data.edges.filter(e => new Date(e.createdAt) >= cutoffDate);
  }, [data.edges, timeFilter]);

  // Get node at position
  const getNodeAtPosition = useCallback((x: number, y: number): string | null => {
    const canvasX = (x - pan.x) / zoom;
    const canvasY = (y - pan.y) / zoom;
    
    for (const node of data.nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;
      const radius = Math.max(10, Math.min(30, 10 + node.score / 5));
      const dist = Math.sqrt((canvasX - pos.x) ** 2 + (canvasY - pos.y) ** 2);
      if (dist < radius + 5) {
        return node.id;
      }
    }
    return null;
  }, [data.nodes, positions, pan, zoom]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Apply transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Clear with theme-aware background
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc';
    ctx.fillRect(-pan.x / zoom, -pan.y / zoom, width / zoom, height / zoom);

    // Draw edges
    for (const edge of filteredEdges) {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) continue;

      const isHighlighted = selectedNode === edge.source || selectedNode === edge.target;
      const isHovered = hoveredNode === edge.source || hoveredNode === edge.target;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      
      if (isHighlighted || isHovered) {
        ctx.strokeStyle = `rgba(59, 130, 246, ${Math.min(1, edge.weight / 40)})`;
        ctx.lineWidth = Math.max(2, edge.weight / 15);
      } else {
        const baseColor = isDark ? '150, 150, 180' : '100, 100, 130';
        ctx.strokeStyle = `rgba(${baseColor}, ${Math.min(0.5, edge.weight / 80)})`;
        ctx.lineWidth = Math.max(1, edge.weight / 25);
      }
      ctx.stroke();

      // Arrow
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const arrowSize = Math.min(8, edge.weight / 8);
      const nodeRadius = Math.max(10, Math.min(30, 10 + (data.nodes.find(n => n.id === edge.target)?.score || 0) / 5));
      
      ctx.beginPath();
      ctx.moveTo(
        target.x - (nodeRadius + 5) * Math.cos(angle),
        target.y - (nodeRadius + 5) * Math.sin(angle)
      );
      ctx.lineTo(
        target.x - (nodeRadius + 5 + arrowSize) * Math.cos(angle) - arrowSize * Math.sin(angle),
        target.y - (nodeRadius + 5 + arrowSize) * Math.sin(angle) + arrowSize * Math.cos(angle)
      );
      ctx.lineTo(
        target.x - (nodeRadius + 5 + arrowSize) * Math.cos(angle) + arrowSize * Math.sin(angle),
        target.y - (nodeRadius + 5 + arrowSize) * Math.sin(angle) - arrowSize * Math.cos(angle)
      );
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    }

    // Draw nodes
    for (const node of data.nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;

      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const isDragging = draggingNode === node.id;
      const radius = Math.max(10, Math.min(30, 10 + node.score / 5));
      const deptColor = DEPT_COLORS[node.department?.code || ''] || '#6b7280';

      // Glow effect for selected/hovered
      if (isSelected || isHovered || isDragging) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 12, 0, Math.PI * 2);
        ctx.fillStyle = isDragging ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)';
        ctx.fill();
      }

      // Node shadow
      ctx.beginPath();
      ctx.arc(pos.x + 2, pos.y + 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(pos.x - radius/3, pos.y - radius/3, 0, pos.x, pos.y, radius);
      gradient.addColorStop(0, deptColor);
      gradient.addColorStop(1, adjustColor(deptColor, -30));
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.strokeStyle = isSelected ? '#ffffff' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = isSelected || isHovered ? 3 : 1.5;
      ctx.stroke();

      // Score indicator ring
      if (node.score > 20) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, -Math.PI / 2, -Math.PI / 2 + (node.score / 100) * Math.PI * 2);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Name label
      ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
      ctx.font = `${isSelected || isHovered ? 'bold ' : ''}11px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Label background
      const name = node.name.split(' ')[0];
      const textWidth = ctx.measureText(name).width;
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.8)';
      ctx.fillRect(pos.x - textWidth/2 - 3, pos.y + radius + 5, textWidth + 6, 14);
      
      ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
      ctx.fillText(name, pos.x, pos.y + radius + 12);
    }

    ctx.restore();

    // Draw zoom indicator
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(zoom * 100)}%`, width - 10, 20);

  }, [data.nodes, filteredEdges, positions, selectedNode, hoveredNode, draggingNode, pan, zoom]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastMouseRef.current = { x, y };

    const nodeId = getNodeAtPosition(x, y);
    if (nodeId) {
      setDraggingNode(nodeId);
      onSelectNode(nodeId);
      const pos = positions.get(nodeId);
      if (pos) {
        dragNode(nodeId, (x - pan.x) / zoom, (y - pan.y) / zoom, true);
      }
    }
  }, [getNodeAtPosition, positions, dragNode, pan, zoom, onSelectNode]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - lastMouseRef.current.x;
    const dy = y - lastMouseRef.current.y;
    lastMouseRef.current = { x, y };

    if (draggingNode) {
      // Drag the node
      const canvasX = (x - pan.x) / zoom;
      const canvasY = (y - pan.y) / zoom;
      dragNode(draggingNode, canvasX, canvasY, true);
    } else if (e.buttons === 1) {
      // Pan the canvas
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else {
      // Hover detection
      const nodeId = getNodeAtPosition(x, y);
      setHoveredNode(nodeId);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = nodeId ? 'grab' : 'default';
      }
    }
  }, [draggingNode, dragNode, pan, zoom, getNodeAtPosition]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      dragNode(draggingNode, 0, 0, false);
      setDraggingNode(null);
    }
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, [draggingNode, dragNode]);

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, zoom * delta));
    
    // Zoom towards mouse position
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newPan = {
        x: x - (x - pan.x) * (newZoom / zoom),
        y: y - (y - pan.y) * (newZoom / zoom)
      };
      setPan(newPan);
    }
    setZoom(newZoom);
  }, [zoom, pan]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (draggingNode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nodeId = getNodeAtPosition(x, y);
    
    if (nodeId && selectedNode === nodeId) {
      onSelectNode(null);
    } else if (nodeId) {
      onSelectNode(nodeId);
    } else {
      onSelectNode(null);
    }
  }, [draggingNode, getNodeAtPosition, selectedNode, onSelectNode]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full rounded-lg cursor-default"
        style={{ aspectRatio: `${width}/${height}`, maxWidth: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/80 dark:bg-slate-900/80 rounded-lg p-3 backdrop-blur border border-border">
        <div className="text-xs text-muted-foreground mb-2">Departments</div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(DEPT_COLORS).map(([code, color]) => (
            <div key={code} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">{code}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); restartSimulation(); }}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 bg-background/80 dark:bg-slate-900/80 rounded-lg p-3 backdrop-blur border border-border">
        <div className="text-xs text-muted-foreground">{data.nodes.length} nodes</div>
        <div className="text-xs text-muted-foreground">{filteredEdges.length} edges</div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-background/80 dark:bg-slate-900/80 rounded-lg p-2 backdrop-blur border border-border text-xs text-muted-foreground">
        Drag nodes • Scroll to zoom • Drag background to pan
      </div>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// Node Detail Panel
function NodeDetail({ node, edges, onClose }: {
  node: GraphNode;
  edges: GraphEdge[];
  onClose: () => void;
}) {
  const outgoingEdges = edges.filter(e => e.source === node.id);
  const incomingEdges = edges.filter(e => e.target === node.id);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{node.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </div>
        <CardDescription>{node.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{node.department?.name || 'No Department'}</Badge>
          {node.rank && <Badge>Rank #{node.rank}</Badge>}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-green-500">{node.score.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Total Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500">{node.rawScore.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Direct Influence</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">{node.volatility.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Volatility</div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="text-sm font-medium mb-2">Outgoing Influence ({outgoingEdges.length})</div>
          <ScrollArea className="h-32">
            {outgoingEdges.map(edge => (
              <div key={edge.id} className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">→ {edge.targetUser.name}</span>
                <Badge variant="outline">{edge.weight.toFixed(0)}</Badge>
              </div>
            ))}
          </ScrollArea>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">Incoming Influence ({incomingEdges.length})</div>
          <ScrollArea className="h-32">
            {incomingEdges.map(edge => (
              <div key={edge.id} className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">← {edge.sourceUser.name}</span>
                <Badge variant="outline">{edge.weight.toFixed(0)}</Badge>
              </div>
            ))}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

// Top Influencers Chart
function TopInfluencersChart({ influencers }: { influencers: AnalyticsData['topInfluencers'] }) {
  const maxScore = Math.max(...influencers.map(i => i.score), 1);

  return (
    <div className="space-y-3">
      {influencers.map((influencer, i) => (
        <motion.div
          key={influencer.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-3"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-black">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{influencer.name}</span>
              <span className="text-sm text-muted-foreground">{influencer.score.toFixed(1)}</span>
            </div>
            <Progress 
              value={(influencer.score / maxScore) * 100} 
              className="h-1.5"
            />
            {influencer.department && (
              <span className="text-xs text-muted-foreground">{influencer.department}</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Department Breakdown
function DepartmentBreakdown({ departments }: { departments: AnalyticsData['departmentBreakdown'] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {departments.map(dept => (
        <motion.div
          key={dept.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-muted/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: DEPT_COLORS[dept.code] || '#6b7280' }}
            />
            <span className="font-medium text-sm">{dept.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Users:</span>
              <span className="ml-1 font-medium">{dept.userCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg:</span>
              <span className="ml-1 font-medium">{dept.avgInfluence.toFixed(1)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Internal:</span>
              <span className="ml-1 font-medium">{dept.internalEdges}</span>
            </div>
            <div>
              <span className="text-muted-foreground">External:</span>
              <span className="ml-1 font-medium">{dept.externalEdges}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Main Application
export default function InfluenceGraphPlatform() {
  const { toast } = useToast();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState(365); // days
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayPosition, setReplayPosition] = useState(0);
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [activeTab, setActiveTab] = useState('graph');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Socket connection
  const { connected: socketConnected, createEdge } = useInfluenceSocket({
    organizationId: organizationId || '',
    onInfluenceUpdate: (update) => {
      toast({
        title: 'Influence Update',
        description: `Type: ${update.type}`,
      });
      // Refresh data
      if (organizationId) {
        fetchGraphData(organizationId);
        fetchAnalyticsData(organizationId);
      }
    }
  });

  // Fetch graph data
  const fetchGraphData = useCallback(async (orgId: string) => {
    try {
      const response = await fetch(`/api/influence?organizationId=${orgId}&propagation=true`);
      if (!response.ok) throw new Error('Failed to fetch graph data');
      const data = await response.json();
      setGraphData(data);
    } catch (error) {
      console.error('Error fetching graph data:', error);
    }
  }, []);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async (orgId: string) => {
    try {
      const response = await fetch(`/api/analytics?organizationId=${orgId}&type=overview`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, []);

  // Initialize database and load data
  const initializeApp = useCallback(async () => {
    try {
      // Use GET endpoint which returns org ID (seeds if needed)
      const response = await fetch('/api/seed');
      const data = await response.json();
      
      if (data.organizationId) {
        setOrganizationId(data.organizationId);
        await Promise.all([fetchGraphData(data.organizationId), fetchAnalyticsData(data.organizationId)]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setLoading(false);
    }
  }, [fetchGraphData, fetchAnalyticsData]);

  // Initial load
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Get selected node data
  const selectedNodeData = useMemo(() => {
    if (!selectedNode || !graphData) return null;
    return graphData.nodes.find(n => n.id === selectedNode) || null;
  }, [selectedNode, graphData]);

  // Recalculate influence scores
  const recalculateScores = async () => {
    try {
      const response = await fetch('/api/influence/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: 'demo-org' })
      });
      const data = await response.json();
      toast({
        title: 'Recalculation Complete',
        description: `Updated ${data.stats?.scoresUpdated || 0} scores in ${data.duration}ms`
      });
      await Promise.all([fetchGraphData(), fetchAnalyticsData()]);
    } catch (error) {
      toast({
        title: 'Recalculation Failed',
        description: 'Could not recalculate influence scores',
        variant: 'destructive'
      });
    }
  };

  // Add influence edge
  const handleAddEdge = async (data: { sourceUserId: string; targetUserId: string; weight: number }) => {
    try {
      const response = await fetch('/api/influence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          organizationId: 'demo-org',
          contextType: 'MANUAL'
        })
      });
      
      if (!response.ok) throw new Error('Failed to create edge');
      
      createEdge(data);
      await fetchGraphData();
      setShowAddEdge(false);
      toast({ title: 'Edge Created', description: 'New influence relationship added' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create influence edge',
        variant: 'destructive'
      });
    }
  };

  // Time replay animation
  useEffect(() => {
    if (!isReplaying) return;

    const interval = setInterval(() => {
      setReplayPosition(prev => {
        if (prev >= 100) {
          setIsReplaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isReplaying]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Network className="w-16 h-16 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Influence Graph Platform</h1>
              <p className="text-xs text-muted-foreground">Real-time organizational influence analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {socketConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <ThemeToggle />
            
            <Button variant="outline" size="sm" onClick={recalculateScores}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recalculate
            </Button>
            
            <Button size="sm" onClick={() => setShowAddEdge(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Edge
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="graph">
              <Network className="w-4 h-4 mr-2" />
              Graph
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="w-4 h-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Graph Tab */}
          <TabsContent value="graph" className="space-y-4">
            {/* Time Filter */}
            <div className="flex items-center gap-4 bg-card/50 rounded-lg p-3">
              <Label className="text-sm text-muted-foreground">Time Range:</Label>
              <Select value={timeFilter.toString()} onValueChange={(v) => setTimeFilter(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">All time</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex-1" />
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4" />
                {graphData?.edges.length || 0} relationships
              </div>
            </div>

            {/* Graph and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    {graphData && (
                      <InfluenceGraph
                        data={graphData}
                        selectedNode={selectedNode}
                        onSelectNode={setSelectedNode}
                        timeFilter={timeFilter}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div>
                {selectedNodeData && graphData ? (
                  <NodeDetail
                    node={selectedNodeData}
                    edges={graphData.edges}
                    onClose={() => setSelectedNode(null)}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Click on a node to view details
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {analyticsData && (
                  <Card className="mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Top Influencers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TopInfluencersChart influencers={analyticsData.topInfluencers} />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            {analyticsData && (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg p-4 border border-blue-500/20"
                  >
                    <Users className="w-5 h-5 text-blue-400 mb-2" />
                    <div className="text-2xl font-bold">{analyticsData.overview.totalUsers}</div>
                    <div className="text-xs text-muted-foreground">Total Users</div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg p-4 border border-green-500/20"
                  >
                    <Link2 className="w-5 h-5 text-green-400 mb-2" />
                    <div className="text-2xl font-bold">{analyticsData.overview.totalEdges}</div>
                    <div className="text-xs text-muted-foreground">Relationships</div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg p-4 border border-purple-500/20"
                  >
                    <Building2 className="w-5 h-5 text-purple-400 mb-2" />
                    <div className="text-2xl font-bold">{analyticsData.overview.totalDepartments}</div>
                    <div className="text-xs text-muted-foreground">Departments</div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-lg p-4 border border-amber-500/20"
                  >
                    <Target className="w-5 h-5 text-amber-400 mb-2" />
                    <div className="text-2xl font-bold">{analyticsData.overview.totalInfluence.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Total Influence</div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 rounded-lg p-4 border border-rose-500/20"
                  >
                    <Award className="w-5 h-5 text-rose-400 mb-2" />
                    <div className="text-2xl font-bold">{analyticsData.overview.averageInfluence.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Avg Score</div>
                  </motion.div>
                </div>

                {/* Top Influencers and Departments */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Top Influencers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TopInfluencersChart influencers={analyticsData.topInfluencers} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-blue-500" />
                        Department Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DepartmentBreakdown departments={analyticsData.departmentBreakdown} />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            {analyticsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.departmentBreakdown.map((dept, i) => (
                  <motion.div
                    key={dept.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: DEPT_COLORS[dept.code] || '#6b7280' }}
                            />
                            <CardTitle className="text-lg">{dept.name}</CardTitle>
                          </div>
                          <Badge variant="secondary">{dept.code}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Members</div>
                            <div className="text-xl font-bold">{dept.userCount}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Avg Influence</div>
                            <div className="text-xl font-bold">{dept.avgInfluence.toFixed(1)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Internal Edges</div>
                            <div className="text-xl font-bold text-green-500">{dept.internalEdges}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">External Edges</div>
                            <div className="text-xl font-bold text-blue-500">{dept.externalEdges}</div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="text-xs text-muted-foreground mb-1">Influence Distribution</div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${(dept.totalInfluence / analyticsData.overview.totalInfluence) * 100}%`,
                                backgroundColor: DEPT_COLORS[dept.code] || '#6b7280'
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-blue-500" />
                    Time-based Replay
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setReplayPosition(0)}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsReplaying(!isReplaying)}
                    >
                      {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setReplayPosition(100)}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeline Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>30 days ago</span>
                    <span>Today</span>
                  </div>
                  <Slider
                    value={[replayPosition]}
                    onValueChange={([v]) => setReplayPosition(v)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Replay Visualization */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">
                      Viewing: {Math.floor(30 - (replayPosition / 100) * 30)} days ago
                    </span>
                  </div>
                  
                  {graphData && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">
                          {Math.floor(graphData.nodes.length * (replayPosition / 100)) || graphData.nodes.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Active Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {Math.floor(graphData.edges.length * (replayPosition / 100)) || graphData.edges.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Relationships</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-500">
                          {((analyticsData?.overview.totalInfluence || 0) * (replayPosition / 100)).toFixed(0) || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Influence</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Event Timeline */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Events</h4>
                  <ScrollArea className="h-48">
                    {graphData?.edges.slice(0, 10).map((edge, i) => (
                      <motion.div
                        key={edge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 py-2 border-b border-border"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="flex-1">
                          <span className="text-sm">
                            {edge.sourceUser.name} → {edge.targetUser.name}
                          </span>
                          <Badge variant="outline" className="ml-2">{edge.weight.toFixed(0)}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(edge.createdAt).toLocaleDateString()}
                        </span>
                      </motion.div>
                    ))}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Edge Dialog */}
      <Dialog open={showAddEdge} onOpenChange={setShowAddEdge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Influence Relationship</DialogTitle>
            <DialogDescription>
              Create a new influence relationship between two users.
            </DialogDescription>
          </DialogHeader>
          <AddEdgeForm 
            users={graphData?.nodes || []} 
            onSubmit={handleAddEdge}
            onCancel={() => setShowAddEdge(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Influence Graph Platform v1.0</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Powered by Next.js & Socket.io
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Last updated: {graphData?.meta.lastUpdated ? new Date(graphData.meta.lastUpdated).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Add Edge Form Component
function AddEdgeForm({ 
  users, 
  onSubmit, 
  onCancel 
}: { 
  users: GraphNode[]; 
  onSubmit: (data: { sourceUserId: string; targetUserId: string; weight: number }) => void;
  onCancel: () => void;
}) {
  const [sourceUserId, setSourceUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [weight, setWeight] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceUserId && targetUserId && sourceUserId !== targetUserId) {
      onSubmit({ sourceUserId, targetUserId, weight });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Source User (Influencer)</Label>
        <Select value={sourceUserId} onValueChange={setSourceUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Select source user" />
          </SelectTrigger>
          <SelectContent>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.department?.code || 'No Dept'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target User (Influenced)</Label>
        <Select value={targetUserId} onValueChange={setTargetUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Select target user" />
          </SelectTrigger>
          <SelectContent>
            {users.filter(u => u.id !== sourceUserId).map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.department?.code || 'No Dept'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Influence Weight: {weight}</Label>
        <Slider
          value={[weight]}
          onValueChange={([v]) => setWeight(v)}
          min={0}
          max={100}
          step={5}
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Weak</span>
          <span>Strong</span>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!sourceUserId || !targetUserId || sourceUserId === targetUserId}>
          Create Relationship
        </Button>
      </DialogFooter>
    </form>
  );
}
