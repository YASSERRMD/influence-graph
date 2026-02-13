/**
 * Users API - CRUD operations for users
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

// GET /api/users - List users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const departmentId = searchParams.get('departmentId');
    const role = searchParams.get('role') as Role | null;
    const userId = searchParams.get('id');

    // Get single user by ID
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          organization: true,
          department: true,
          influenceScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 10
          },
          _count: {
            select: {
              outgoingInfluence: true,
              incomingInfluence: true
            }
          }
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json(user);
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    if (organizationId) where.organizationId = organizationId;
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;

    const users = await db.user.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true }
        },
        organization: {
          select: { id: true, name: true, slug: true }
        },
        influenceScores: {
          where: { scoreType: 'TOTAL' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
      ...user,
      currentScore: user.influenceScores[0]?.score || 0,
      currentRank: user.influenceScores[0]?.rank || null
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, role, organizationId, departmentId, jobTitle, avatarUrl } = body;

    if (!email || !name || !organizationId) {
      return NextResponse.json({ error: 'Email, name, and organizationId are required' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        email,
        name,
        role: role || Role.MEMBER,
        organizationId,
        departmentId,
        jobTitle,
        avatarUrl
      },
      include: {
        department: true,
        organization: true
      }
    });

    // Create initial influence score
    await db.influenceScore.create({
      data: {
        userId: user.id,
        organizationId,
        score: 0,
        rawScore: 0,
        volatility: 0,
        scoreType: 'TOTAL'
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT /api/users - Update a user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, role, departmentId, jobTitle, avatarUrl, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: {
        name,
        role,
        departmentId,
        jobTitle,
        avatarUrl,
        isActive
      },
      include: {
        department: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
