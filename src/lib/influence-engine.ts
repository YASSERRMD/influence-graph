/**
 * Influence Propagation Algorithm
 * 
 * Implements weighted influence propagation through the organizational graph.
 * Uses depth-limited propagation with decay factors.
 */

export interface InfluenceNode {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  score: number;
  rawScore: number;
  volatility: number;
}

export interface InfluenceEdge {
  id: string;
  sourceUserId: string;
  targetUserId: string;
  weight: number;
  context?: string;
  createdAt: Date;
}

export interface PropagationResult {
  nodeId: string;
  directInfluence: number;
  propagatedInfluence: number;
  totalInfluence: number;
  paths: InfluencePath[];
}

export interface InfluencePath {
  path: string[];
  weight: number;
  depth: number;
}

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  averageInfluence: number;
  density: number;
  clustering: number;
}

// Configuration for the propagation algorithm
export const PROPAGATION_CONFIG = {
  MAX_DEPTH: 3, // Maximum depth for influence propagation
  DECAY_FACTOR: 0.6, // Influence decays by 40% per level
  MIN_WEIGHT_THRESHOLD: 0.01, // Minimum weight to consider
  DEFAULT_DECAY_RATE: 0.05, // 5% decay per day
  CACHE_TTL: 300000, // 5 minutes cache TTL
};

/**
 * Calculate weighted propagation of influence through the graph
 * 
 * Algorithm:
 * 1. Start from each node with direct influence
 * 2. Propagate influence through edges with decay factor
 * 3. Sum all incoming propagated influence
 * 4. Return total influence score
 */
export function calculatePropagatedInfluence(
  edges: InfluenceEdge[],
  nodeIds: string[],
  maxDepth: number = PROPAGATION_CONFIG.MAX_DEPTH,
  decayFactor: number = PROPAGATION_CONFIG.DECAY_FACTOR
): Map<string, PropagationResult> {
  const results = new Map<string, PropagationResult>();
  
  // Build adjacency list for efficient traversal
  const adjacencyList = buildAdjacencyList(edges);
  
  // Calculate influence for each node
  for (const nodeId of nodeIds) {
    const result = propagateFromNode(nodeId, adjacencyList, maxDepth, decayFactor);
    results.set(nodeId, result);
  }
  
  return results;
}

/**
 * Build adjacency list from edges for efficient graph traversal
 */
export function buildAdjacencyList(edges: InfluenceEdge[]): Map<string, InfluenceEdge[]> {
  const adjacencyList = new Map<string, InfluenceEdge[]>();
  
  for (const edge of edges) {
    if (!adjacencyList.has(edge.sourceUserId)) {
      adjacencyList.set(edge.sourceUserId, []);
    }
    adjacencyList.get(edge.sourceUserId)!.push(edge);
  }
  
  return adjacencyList;
}

/**
 * Propagate influence from a single source node
 */
function propagateFromNode(
  sourceId: string,
  adjacencyList: Map<string, InfluenceEdge[]>,
  maxDepth: number,
  decayFactor: number
): PropagationResult {
  const paths: InfluencePath[] = [];
  let propagatedInfluence = 0;
  
  // BFS traversal for influence propagation
  const queue: Array<{ nodeId: string; weight: number; path: string[]; depth: number }> = [];
  const visited = new Set<string>();
  
  // Start with the source node
  queue.push({ nodeId: sourceId, weight: 1.0, path: [sourceId], depth: 0 });
  visited.add(sourceId);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.depth > 0) {
      // Record this path's contribution
      paths.push({
        path: [...current.path],
        weight: current.weight,
        depth: current.depth
      });
      
      // Add to propagated influence
      propagatedInfluence += current.weight;
    }
    
    // Stop at max depth
    if (current.depth >= maxDepth) continue;
    
    // Explore neighbors
    const neighbors = adjacencyList.get(current.nodeId) || [];
    for (const edge of neighbors) {
      const targetId = edge.targetUserId;
      
      // Calculate propagated weight with decay
      const propagatedWeight = current.weight * (edge.weight / 100) * decayFactor;
      
      // Skip if below threshold
      if (propagatedWeight < PROPAGATION_CONFIG.MIN_WEIGHT_THRESHOLD) continue;
      
      // Add to queue for further propagation
      queue.push({
        nodeId: targetId,
        weight: propagatedWeight,
        path: [...current.path, targetId],
        depth: current.depth + 1
      });
    }
  }
  
  // Calculate direct influence (sum of outgoing edge weights)
  const directInfluence = (adjacencyList.get(sourceId) || [])
    .reduce((sum, edge) => sum + edge.weight, 0);
  
  return {
    nodeId: sourceId,
    directInfluence,
    propagatedInfluence,
    totalInfluence: directInfluence + propagatedInfluence,
    paths
  };
}

/**
 * Calculate influence decay based on time elapsed
 * 
 * Formula: newWeight = weight * (1 - decayRate) ^ daysElapsed
 */
export function calculateDecayedWeight(
  originalWeight: number,
  createdAt: Date,
  decayRate: number = PROPAGATION_CONFIG.DEFAULT_DECAY_RATE
): number {
  const daysElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.pow(1 - decayRate, daysElapsed);
  return originalWeight * decayFactor;
}

/**
 * Update influence based on events (project success, proposal adoption, etc.)
 */
export function calculateInfluenceDelta(
  eventType: 'PROJECT_SUCCESS' | 'PROPOSAL_ADOPTED' | 'MENTORSHIP' | 'COLLABORATION',
  impactScore: number = 1.0
): number {
  const baseMultipliers = {
    PROJECT_SUCCESS: 15,
    PROPOSAL_ADOPTED: 10,
    MENTORSHIP: 5,
    COLLABORATION: 3
  };
  
  return baseMultipliers[eventType] * impactScore;
}

/**
 * Calculate influence volatility (standard deviation of score changes)
 */
export function calculateVolatility(
  historicalScores: number[]
): number {
  if (historicalScores.length < 2) return 0;
  
  const mean = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
  const squaredDiffs = historicalScores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / historicalScores.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate cross-department influence matrix
 */
export function calculateDepartmentInfluenceMatrix(
  edges: InfluenceEdge[],
  nodes: InfluenceNode[]
): Map<string, Map<string, number>> {
  const nodeDepartments = new Map<string, string>();
  
  // Map nodes to departments
  for (const node of nodes) {
    if (node.departmentId) {
      nodeDepartments.set(node.id, node.departmentId);
    }
  }
  
  // Build department influence matrix
  const matrix = new Map<string, Map<string, number>>();
  
  for (const edge of edges) {
    const sourceDept = nodeDepartments.get(edge.sourceUserId);
    const targetDept = nodeDepartments.get(edge.targetUserId);
    
    if (sourceDept && targetDept && sourceDept !== targetDept) {
      if (!matrix.has(sourceDept)) {
        matrix.set(sourceDept, new Map());
      }
      
      const currentWeight = matrix.get(sourceDept)!.get(targetDept) || 0;
      matrix.get(sourceDept)!.set(targetDept, currentWeight + edge.weight);
    }
  }
  
  return matrix;
}

/**
 * Find top influencers by various metrics
 */
export function findTopInfluencers(
  nodes: InfluenceNode[],
  metric: 'total' | 'direct' | 'propagated' | 'volatility' = 'total',
  limit: number = 10
): InfluenceNode[] {
  const sortedNodes = [...nodes].sort((a, b) => {
    switch (metric) {
      case 'direct':
        return b.score - a.score;
      case 'propagated':
        return (b.rawScore - b.score) - (a.rawScore - a.score);
      case 'volatility':
        return b.volatility - a.volatility;
      default:
        return b.rawScore - a.rawScore;
    }
  });
  
  return sortedNodes.slice(0, limit);
}

/**
 * Calculate graph metrics
 */
export function calculateGraphMetrics(
  nodes: InfluenceNode[],
  edges: InfluenceEdge[]
): GraphMetrics {
  const totalNodes = nodes.length;
  const totalEdges = edges.length;
  
  // Average influence
  const totalInfluence = nodes.reduce((sum, node) => sum + node.rawScore, 0);
  const averageInfluence = totalNodes > 0 ? totalInfluence / totalNodes : 0;
  
  // Graph density (actual edges / possible edges)
  const maxPossibleEdges = totalNodes * (totalNodes - 1);
  const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;
  
  // Clustering coefficient (simplified)
  const adjacencyList = buildAdjacencyList(edges);
  let totalTriangles = 0;
  let totalPossibleTriangles = 0;
  
  for (const node of nodes) {
    const neighbors = (adjacencyList.get(node.id) || []).map(e => e.targetUserId);
    const neighborSet = new Set(neighbors);
    
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        totalPossibleTriangles++;
        const neighborsOfI = (adjacencyList.get(neighbors[i]) || []).map(e => e.targetUserId);
        if (neighborsOfI.includes(neighbors[j])) {
          totalTriangles++;
        }
      }
    }
  }
  
  const clustering = totalPossibleTriangles > 0 ? totalTriangles / totalPossibleTriangles : 0;
  
  return {
    totalNodes,
    totalEdges,
    averageInfluence,
    density,
    clustering
  };
}

/**
 * Detect influence communities using label propagation
 */
export function detectCommunities(
  edges: InfluenceEdge[],
  nodeIds: string[]
): Map<string, number> {
  const adjacencyList = buildAdjacencyList(edges);
  
  // Initialize each node with unique label
  const labels = new Map<string, number>();
  let labelCounter = 0;
  
  for (const nodeId of nodeIds) {
    labels.set(nodeId, labelCounter++);
  }
  
  // Run label propagation iterations
  const maxIterations = 10;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    
    for (const nodeId of nodeIds) {
      const neighbors = adjacencyList.get(nodeId) || [];
      
      if (neighbors.length === 0) continue;
      
      // Count label frequencies weighted by edge weight
      const labelCounts = new Map<number, number>();
      
      for (const edge of neighbors) {
        const neighborLabel = labels.get(edge.targetUserId) || 0;
        const currentCount = labelCounts.get(neighborLabel) || 0;
        labelCounts.set(neighborLabel, currentCount + edge.weight);
      }
      
      // Find most frequent label
      let maxCount = 0;
      let bestLabel = labels.get(nodeId) || 0;
      
      labelCounts.forEach((count, label) => {
        if (count > maxCount) {
          maxCount = count;
          bestLabel = label;
        }
      });
      
      if (labels.get(nodeId) !== bestLabel) {
        labels.set(nodeId, bestLabel);
        changed = true;
      }
    }
    
    if (!changed) break;
  }
  
  return labels;
}
