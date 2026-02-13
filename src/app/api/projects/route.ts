/**
 * Projects API - CRUD operations for projects and proposals
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { influenceCache } from '@/lib/cache';
import { calculateInfluenceDelta } from '@/lib/influence-engine';

// GET /api/projects - List projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const projectId = searchParams.get('id');
    const status = searchParams.get('status');

    if (projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          department: true,
          author: { select: { id: true, name: true, email: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, jobTitle: true } }
            }
          },
          proposals: {
            include: {
              author: { select: { id: true, name: true } },
              _count: { select: { votes: true } }
            }
          }
        }
      });
      return NextResponse.json(project);
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;

    const projects = await db.project.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, proposals: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, organizationId, departmentId, authorId, startDate, endDate, budget, members } = body;

    if (!name || !organizationId || !authorId) {
      return NextResponse.json({ error: 'Name, organizationId, and authorId are required' }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        name,
        description,
        organizationId,
        departmentId,
        authorId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        budget,
        members: members ? {
          create: members.map((m: { userId: string; role: string }) => ({
            userId: m.userId,
            role: m.role || 'MEMBER'
          }))
        } : undefined
      },
      include: {
        members: { include: { user: { select: { id: true, name: true } } } }
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PUT /api/projects - Update a project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, successScore, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status, successScore };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.endDate = endDate ? new Date(endDate) : new Date();
    }

    const project = await db.project.update({
      where: { id },
      data: updateData
    });

    // If project is completed with success, trigger influence events
    if (status === 'COMPLETED' && successScore && successScore > 0.5) {
      const members = await db.projectMember.findMany({
        where: { projectId: id }
      });

      const influenceDelta = calculateInfluenceDelta('PROJECT_SUCCESS', successScore);

      for (const member of members) {
        await db.influenceEvent.create({
          data: {
            organizationId: project.organizationId,
            subjectUserId: member.userId,
            eventType: 'PROJECT_SUCCESS',
            weightDelta: influenceDelta * (member.role === 'LEAD' ? 1.5 : 1),
            context: JSON.stringify({ projectId: id, projectName: project.name })
          }
        });
      }

      // Invalidate cache
      influenceCache.deletePattern(`graph:${project.organizationId}*`);
      influenceCache.deletePattern(`scores:${project.organizationId}*`);
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects - Delete a project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    await db.project.delete({ where: { id } });
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
