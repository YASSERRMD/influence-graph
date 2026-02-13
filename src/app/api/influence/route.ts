/**
 * Influence API - CRUD operations for influence edges and score calculations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { influenceCache, CacheKeys } from '@/lib/cache';
import {
  calculatePropagatedInfluence,
  calculateDecayedWeight,
  calculateInfluenceDelta,
  buildAdjacencyList,
  type InfluenceEdge
} from '@/lib/influence-engine';

// GET /api/influence - Get influence graph data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');
    const edgeId = searchParams.get('edgeId');
    const includePropagation = searchParams.get('propagation') === 'true';

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Get single edge
    if (edgeId) {
      const edge = await db.influenceEdge.findUnique({
        where: { id: edgeId },
        include: {
          sourceUser: { select: { id: true, name: true, email: true } },
          targetUser: { select: { id: true, name: true, email: true } }
        }
      });
      return NextResponse.json(edge);
    }

    // Get user's influence details
    if (userId) {
      const userInfluence = await db.user.findUnique({
        where: { id: userId },
        include: {
          outgoingInfluence: {
            include: {
              targetUser: { select: { id: true, name: true, email: true } }
            }
          },
          incomingInfluence: {
            include: {
              sourceUser: { select: { id: true, name: true, email: true } }
            }
          },
          influenceScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 30
          }
        }
      });

      return NextResponse.json(userInfluence);
    }

    // Check cache for full graph
    const cacheKey = CacheKeys.graph(organizationId);
    const cached = influenceCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get full influence graph
    const [edges, users] = await Promise.all([
      db.influenceEdge.findMany({
        where: { organizationId, isActive: true },
        include: {
          sourceUser: {
            select: {
              id: true,
              name: true,
              email: true,
              department: { select: { id: true, name: true, code: true } }
            }
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              department: { select: { id: true, name: true, code: true } }
            }
          }
        },
        orderBy: { weight: 'desc' }
      }),
      db.user.findMany({
        where: { organizationId, isActive: true },
        include: {
          department: { select: { id: true, name: true, code: true } },
          influenceScores: {
            where: { scoreType: 'TOTAL' },
            take: 1
          }
        }
      })
    ]);

    // Apply time decay to edges
    const decayedEdges = edges.map(edge => ({
      ...edge,
      decayedWeight: calculateDecayedWeight(edge.weight, edge.createdAt)
    }));

    // Calculate propagation if requested
    let propagationResults = null;
    if (includePropagation) {
      const typedEdges: InfluenceEdge[] = edges.map(e => ({
        id: e.id,
        sourceUserId: e.sourceUserId,
        targetUserId: e.targetUserId,
        weight: e.weight,
        context: e.context || undefined,
        createdAt: e.createdAt
      }));

      propagationResults = calculatePropagatedInfluence(
        typedEdges,
        users.map(u => u.id)
      );
    }

    // Build response
    const graphData = {
      nodes: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        score: user.influenceScores[0]?.score || 0,
        rawScore: user.influenceScores[0]?.rawScore || 0,
        volatility: user.influenceScores[0]?.volatility || 0,
        rank: user.influenceScores[0]?.rank || null
      })),
      edges: decayedEdges.map(edge => ({
        id: edge.id,
        source: edge.sourceUserId,
        target: edge.targetUserId,
        weight: edge.weight,
        decayedWeight: edge.decayedWeight,
        context: edge.context,
        contextType: edge.contextType,
        sourceUser: edge.sourceUser,
        targetUser: edge.targetUser,
        createdAt: edge.createdAt
      })),
      propagation: propagationResults ? Object.fromEntries(propagationResults) : null,
      meta: {
        totalNodes: users.length,
        totalEdges: edges.length,
        lastUpdated: new Date()
      }
    };

    // Cache the result
    influenceCache.set(cacheKey, graphData, 60000); // 1 minute cache

    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Error fetching influence data:', error);
    return NextResponse.json({ error: 'Failed to fetch influence data' }, { status: 500 });
  }
}

// POST /api/influence - Create a new influence edge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceUserId, targetUserId, organizationId, weight, context, contextType } = body;

    if (!sourceUserId || !targetUserId || !organizationId || weight === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sourceUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot create self-influence edge' }, { status: 400 });
    }

    // Validate weight range
    if (weight < 0 || weight > 100) {
      return NextResponse.json({ error: 'Weight must be between 0 and 100' }, { status: 400 });
    }

    // Check for existing edge
    const existingEdge = await db.influenceEdge.findFirst({
      where: {
        sourceUserId,
        targetUserId,
        organizationId,
        context: context || null
      }
    });

    if (existingEdge) {
      return NextResponse.json({ error: 'Influence edge already exists' }, { status: 409 });
    }

    const edge = await db.influenceEdge.create({
      data: {
        sourceUserId,
        targetUserId,
        organizationId,
        weight,
        context,
        contextType,
        verifiedAt: new Date()
      },
      include: {
        sourceUser: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } }
      }
    });

    // Invalidate cache
    influenceCache.deletePattern(`graph:${organizationId}*`);
    influenceCache.deletePattern(`scores:${organizationId}*`);

    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    console.error('Error creating influence edge:', error);
    return NextResponse.json({ error: 'Failed to create influence edge' }, { status: 500 });
  }
}

// PUT /api/influence - Update an influence edge
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, weight, context, contextType, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 });
    }

    const edge = await db.influenceEdge.update({
      where: { id },
      data: {
        weight,
        context,
        contextType,
        isActive
      },
      include: {
        sourceUser: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } }
      }
    });

    // Invalidate cache
    influenceCache.deletePattern(`graph:${edge.organizationId}*`);

    return NextResponse.json(edge);
  } catch (error) {
    console.error('Error updating influence edge:', error);
    return NextResponse.json({ error: 'Failed to update influence edge' }, { status: 500 });
  }
}

// DELETE /api/influence - Delete an influence edge
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 });
    }

    const edge = await db.influenceEdge.findUnique({
      where: { id },
      select: { organizationId: true }
    });

    await db.influenceEdge.delete({
      where: { id }
    });

    // Invalidate cache
    if (edge) {
      influenceCache.deletePattern(`graph:${edge.organizationId}*`);
    }

    return NextResponse.json({ message: 'Influence edge deleted successfully' });
  } catch (error) {
    console.error('Error deleting influence edge:', error);
    return NextResponse.json({ error: 'Failed to delete influence edge' }, { status: 500 });
  }
}
