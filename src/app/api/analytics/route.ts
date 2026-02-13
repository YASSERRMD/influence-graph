/**
 * Analytics API - Influence analytics and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { influenceCache, CacheKeys } from '@/lib/cache';
import {
  findTopInfluencers,
  calculateDepartmentInfluenceMatrix,
  calculateGraphMetrics,
  calculateVolatility,
  type InfluenceNode,
  type InfluenceEdge
} from '@/lib/influence-engine';

// GET /api/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type') || 'overview';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = CacheKeys.analytics(`${organizationId}:${type}`);
    const cached = influenceCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let result;

    switch (type) {
      case 'top':
        result = await getTopInfluencers(organizationId, limit);
        break;
      case 'heatmap':
        result = await getDepartmentHeatmap(organizationId);
        break;
      case 'volatility':
        result = await getVolatilityAnalysis(organizationId);
        break;
      case 'metrics':
        result = await getGraphMetrics(organizationId);
        break;
      case 'trends':
        result = await getInfluenceTrends(organizationId);
        break;
      case 'overview':
      default:
        result = await getOverview(organizationId);
    }

    // Cache result
    influenceCache.set(cacheKey, result, 120000); // 2 minutes

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

// Get overview analytics
async function getOverview(organizationId: string) {
  const [users, edges, departments] = await Promise.all([
    db.user.findMany({
      where: { organizationId, isActive: true },
      include: {
        department: true,
        influenceScores: { where: { scoreType: 'TOTAL' }, take: 1 }
      }
    }),
    db.influenceEdge.findMany({
      where: { organizationId, isActive: true }
    }),
    db.department.findMany({
      where: { organizationId }
    })
  ]);

  // Calculate metrics
  const totalInfluence = users.reduce((sum, u) => sum + (u.influenceScores[0]?.score || 0), 0);
  const avgInfluence = users.length > 0 ? totalInfluence / users.length : 0;
  
  // Top 5 influencers
  const sortedUsers = [...users].sort(
    (a, b) => (b.influenceScores[0]?.score || 0) - (a.influenceScores[0]?.score || 0)
  );
  const topInfluencers = sortedUsers.slice(0, 5).map(u => ({
    id: u.id,
    name: u.name,
    department: u.department?.name,
    score: u.influenceScores[0]?.score || 0
  }));

  // Department breakdown
  const deptStats = departments.map(dept => {
    const deptUsers = users.filter(u => u.departmentId === dept.id);
    const deptInfluence = deptUsers.reduce(
      (sum, u) => sum + (u.influenceScores[0]?.score || 0),
      0
    );
    const deptEdges = edges.filter(
      e => deptUsers.some(u => u.id === e.sourceUserId || u.id === e.targetUserId)
    );
    
    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      userCount: deptUsers.length,
      totalInfluence: deptInfluence,
      avgInfluence: deptUsers.length > 0 ? deptInfluence / deptUsers.length : 0,
      internalEdges: deptEdges.filter(
        e => deptUsers.some(u => u.id === e.sourceUserId) && deptUsers.some(u => u.id === e.targetUserId)
      ).length,
      externalEdges: deptEdges.filter(
        e => !deptUsers.some(u => u.id === e.sourceUserId) || !deptUsers.some(u => u.id === e.targetUserId)
      ).length
    };
  });

  return {
    overview: {
      totalUsers: users.length,
      totalEdges: edges.length,
      totalDepartments: departments.length,
      totalInfluence,
      averageInfluence: avgInfluence
    },
    topInfluencers,
    departmentBreakdown: deptStats,
    lastUpdated: new Date()
  };
}

// Get top influencers
async function getTopInfluencers(organizationId: string, limit: number) {
  const users = await db.user.findMany({
    where: { organizationId, isActive: true },
    include: {
      department: { select: { id: true, name: true, code: true } },
      influenceScores: { where: { scoreType: 'TOTAL' }, take: 1 },
      _count: { select: { outgoingInfluence: true, incomingInfluence: true } }
    }
  });

  const nodes: InfluenceNode[] = users.map(u => ({
    id: u.id,
    name: u.name,
    departmentId: u.departmentId || undefined,
    departmentName: u.department?.name,
    score: u.influenceScores[0]?.score || 0,
    rawScore: u.influenceScores[0]?.rawScore || 0,
    volatility: u.influenceScores[0]?.volatility || 0
  }));

  const topInfluencers = findTopInfluencers(nodes, 'total', limit);

  return {
    topInfluencers: topInfluencers.map((node, index) => ({
      rank: index + 1,
      ...node,
      outgoingEdges: users.find(u => u.id === node.id)?._count.outgoingInfluence || 0,
      incomingEdges: users.find(u => u.id === node.id)?._count.incomingInfluence || 0
    })),
    metric: 'total',
    lastUpdated: new Date()
  };
}

// Get department influence heatmap
async function getDepartmentHeatmap(organizationId: string) {
  const [users, edges, departments] = await Promise.all([
    db.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, departmentId: true }
    }),
    db.influenceEdge.findMany({
      where: { organizationId, isActive: true }
    }),
    db.department.findMany({
      where: { organizationId }
    })
  ]);

  const nodes: InfluenceNode[] = users.map(u => ({
    id: u.id,
    name: '',
    departmentId: u.departmentId || undefined,
    score: 0,
    rawScore: 0,
    volatility: 0
  }));

  const typedEdges: InfluenceEdge[] = edges.map(e => ({
    id: e.id,
    sourceUserId: e.sourceUserId,
    targetUserId: e.targetUserId,
    weight: e.weight,
    context: e.context || undefined,
    createdAt: e.createdAt
  }));

  const matrix = calculateDepartmentInfluenceMatrix(typedEdges, nodes);

  // Convert to array format for frontend
  const heatmapData: Array<{
    sourceDept: string;
    targetDept: string;
    sourceName: string;
    targetName: string;
    weight: number;
  }> = [];

  const deptNames = Object.fromEntries(departments.map(d => [d.id, d.name]));

  matrix.forEach((targets, sourceId) => {
    targets.forEach((weight, targetId) => {
      heatmapData.push({
        sourceDept: sourceId,
        targetDept: targetId,
        sourceName: deptNames[sourceId] || sourceId,
        targetName: deptNames[targetId] || targetId,
        weight
      });
    });
  });

  // Sort by weight
  heatmapData.sort((a, b) => b.weight - a.weight);

  return {
    heatmap: heatmapData,
    departments: departments.map(d => ({ id: d.id, name: d.name, code: d.code })),
    lastUpdated: new Date()
  };
}

// Get volatility analysis
async function getVolatilityAnalysis(organizationId: string) {
  const users = await db.user.findMany({
    where: { organizationId, isActive: true },
    include: {
      department: { select: { id: true, name: true } },
      influenceScores: {
        where: { scoreType: 'TOTAL' },
        orderBy: { calculatedAt: 'desc' },
        take: 30
      }
    }
  });

  const volatilityData = users.map(user => {
    const scores = user.influenceScores.map(s => s.score);
    const volatility = calculateVolatility(scores);

    return {
      id: user.id,
      name: user.name,
      department: user.department,
      currentScore: scores[0] || 0,
      volatility,
      scoreHistory: scores.slice(0, 10)
    };
  });

  // Sort by volatility (most volatile first)
  volatilityData.sort((a, b) => b.volatility - a.volatility);

  return {
    volatility: volatilityData,
    averageVolatility: volatilityData.reduce((sum, u) => sum + u.volatility, 0) / volatilityData.length,
    mostVolatile: volatilityData.slice(0, 10),
    mostStable: volatilityData.slice(-10).reverse(),
    lastUpdated: new Date()
  };
}

// Get graph metrics
async function getGraphMetrics(organizationId: string) {
  const [users, edges] = await Promise.all([
    db.user.findMany({
      where: { organizationId, isActive: true },
      include: { influenceScores: { where: { scoreType: 'TOTAL' }, take: 1 } }
    }),
    db.influenceEdge.findMany({
      where: { organizationId, isActive: true }
    })
  ]);

  const nodes: InfluenceNode[] = users.map(u => ({
    id: u.id,
    name: u.name,
    departmentId: u.departmentId || undefined,
    score: u.influenceScores[0]?.score || 0,
    rawScore: u.influenceScores[0]?.rawScore || 0,
    volatility: u.influenceScores[0]?.volatility || 0
  }));

  const typedEdges: InfluenceEdge[] = edges.map(e => ({
    id: e.id,
    sourceUserId: e.sourceUserId,
    targetUserId: e.targetUserId,
    weight: e.weight,
    context: e.context || undefined,
    createdAt: e.createdAt
  }));

  const metrics = calculateGraphMetrics(nodes, typedEdges);

  // Additional metrics
  const edgeWeightDistribution = edges.reduce((acc, e) => {
    const range = Math.floor(e.weight / 20) * 20;
    const label = `${range}-${range + 20}`;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    ...metrics,
    edgeWeightDistribution,
    averageEdgeWeight: edges.length > 0
      ? edges.reduce((sum, e) => sum + e.weight, 0) / edges.length
      : 0,
    lastUpdated: new Date()
  };
}

// Get influence trends
async function getInfluenceTrends(organizationId: string) {
  // Get influence events grouped by day
  const events = await db.influenceEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Group by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = event.createdAt.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { total: 0, types: {} };
    }
    acc[date].total += event.weightDelta;
    acc[date].types[event.eventType] = (acc[date].types[event.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, { total: number; types: Record<string, number> }>);

  // Get recent score changes
  const recentScores = await db.influenceScore.findMany({
    where: {
      organizationId,
      scoreType: 'TOTAL'
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, name: true } }
    }
  });

  return {
    eventsByDate,
    recentScoreChanges: recentScores.map(s => ({
      userId: s.userId,
      userName: s.user.name,
      score: s.score,
      updatedAt: s.updatedAt
    })),
    lastUpdated: new Date()
  };
}
