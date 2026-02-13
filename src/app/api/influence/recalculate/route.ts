/**
 * Influence Recalculation API
 * 
 * Triggers recalculation of influence scores based on:
 * - Current edges with time decay
 * - Pending influence events
 * - Propagation algorithm results
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { influenceCache, CacheKeys } from '@/lib/cache';
import {
  calculatePropagatedInfluence,
  calculateDecayedWeight,
  calculateVolatility,
  type InfluenceEdge
} from '@/lib/influence-engine';

// POST /api/influence/recalculate - Trigger full recalculation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, applyDecay = true, processEvents = true } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const startTime = Date.now();
    const stats = {
      usersProcessed: 0,
      edgesProcessed: 0,
      eventsProcessed: 0,
      scoresUpdated: 0
    };

    // Step 1: Get all active edges
    const edges = await db.influenceEdge.findMany({
      where: { organizationId, isActive: true }
    });
    stats.edgesProcessed = edges.length;

    // Step 2: Process pending influence events
    let events: Array<{ id: string; subjectUserId: string; weightDelta: number; eventType: string }> = [];
    if (processEvents) {
      events = await db.influenceEvent.findMany({
        where: { organizationId, processedAt: null },
        orderBy: { createdAt: 'asc' }
      });
      stats.eventsProcessed = events.length;
    }

    // Step 3: Get all users with their current scores
    const users = await db.user.findMany({
      where: { organizationId, isActive: true },
      include: {
        influenceScores: { where: { scoreType: 'TOTAL' } },
        outgoingInfluence: { where: { isActive: true } },
        incomingInfluence: { where: { isActive: true } }
      }
    });
    stats.usersProcessed = users.length;

    // Step 4: Apply time decay to edges
    const typedEdges: InfluenceEdge[] = edges.map(e => ({
      id: e.id,
      sourceUserId: e.sourceUserId,
      targetUserId: e.targetUserId,
      weight: applyDecay ? calculateDecayedWeight(e.weight, e.createdAt) : e.weight,
      context: e.context || undefined,
      createdAt: e.createdAt
    }));

    // Step 5: Calculate propagated influence
    const propagationResults = calculatePropagatedInfluence(
      typedEdges,
      users.map(u => u.id)
    );

    // Step 6: Aggregate influence events per user
    const eventImpact = new Map<string, number>();
    for (const event of events) {
      const current = eventImpact.get(event.subjectUserId) || 0;
      eventImpact.set(event.subjectUserId, current + event.weightDelta);
    }

    // Step 7: Calculate new scores for each user
    const scoreUpdates = [];
    const userIds = users.map(u => u.id);
    
    // Calculate ranks
    const scoresWithIds = users.map(user => {
      const currentScore = user.influenceScores[0]?.score || 0;
      const propagation = propagationResults.get(user.id);
      const eventBonus = eventImpact.get(user.id) || 0;
      
      // Calculate outgoing influence sum (direct influence)
      const directInfluence = user.outgoingInfluence.reduce((sum, e) => {
        const decayedWeight = applyDecay ? calculateDecayedWeight(e.weight, e.createdAt) : e.weight;
        return sum + decayedWeight;
      }, 0);

      // Calculate new score
      const newScore = directInfluence + (propagation?.propagatedInfluence || 0) + eventBonus;
      
      return {
        id: user.id,
        currentScore,
        newScore: Math.max(0, newScore),
        directInfluence,
        propagatedInfluence: propagation?.propagatedInfluence || 0,
        eventBonus
      };
    });

    // Sort for ranking
    scoresWithIds.sort((a, b) => b.newScore - a.newScore);

    // Get historical scores for volatility
    const historicalScores = await db.influenceScore.findMany({
      where: {
        userId: { in: userIds },
        scoreType: 'TOTAL'
      },
      orderBy: { calculatedAt: 'desc' },
      take: 30
    });

    // Update scores
    for (let i = 0; i < scoresWithIds.length; i++) {
      const scoreData = scoresWithIds[i];
      const userHistory = historicalScores
        .filter(s => s.userId === scoreData.id)
        .map(s => s.score);
      
      // Add current new score to history for volatility calculation
      userHistory.unshift(scoreData.newScore);
      
      const volatility = calculateVolatility(userHistory.slice(0, 10));

      await db.influenceScore.updateMany({
        where: { userId: scoreData.id, scoreType: 'TOTAL' },
        data: {
          score: scoreData.newScore,
          rawScore: scoreData.directInfluence,
          volatility,
          rank: i + 1,
          calculatedAt: new Date()
        }
      });
      
      scoreUpdates.push({
        userId: scoreData.id,
        oldScore: scoreData.currentScore,
        newScore: scoreData.newScore,
        rank: i + 1,
        volatility
      });
    }
    stats.scoresUpdated = scoreUpdates.length;

    // Step 8: Mark events as processed
    if (events.length > 0) {
      await db.influenceEvent.updateMany({
        where: { id: { in: events.map(e => e.id) } },
        data: { processedAt: new Date() }
      });
    }

    // Step 9: Invalidate all caches
    influenceCache.deletePattern(`graph:${organizationId}*`);
    influenceCache.deletePattern(`scores:${organizationId}*`);
    influenceCache.deletePattern(`analytics:${organizationId}*`);
    influenceCache.deletePattern(`top:${organizationId}*`);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      stats,
      duration,
      topChanges: scoreUpdates.slice(0, 5),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error recalculating influence:', error);
    return NextResponse.json({ error: 'Failed to recalculate influence' }, { status: 500 });
  }
}

// GET /api/influence/recalculate - Get recalculation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Get pending events count
    const pendingEvents = await db.influenceEvent.count({
      where: { organizationId, processedAt: null }
    });

    // Get last recalculation time
    const lastScore = await db.influenceScore.findFirst({
      where: { organizationId, scoreType: 'TOTAL' },
      orderBy: { calculatedAt: 'desc' },
      select: { calculatedAt: true }
    });

    return NextResponse.json({
      pendingEvents,
      lastRecalculation: lastScore?.calculatedAt || null,
      recommended: pendingEvents > 10
    });
  } catch (error) {
    console.error('Error getting recalculation status:', error);
    return NextResponse.json({ error: 'Failed to get recalculation status' }, { status: 500 });
  }
}
