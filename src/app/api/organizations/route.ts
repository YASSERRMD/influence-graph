/**
 * Organizations API - CRUD operations for organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/organizations - List all organizations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const org = await db.organization.findUnique({
        where: { slug },
        include: {
          departments: true,
          _count: {
            select: { users: true, projects: true }
          }
        }
      });

      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      return NextResponse.json(org);
    }

    const organizations = await db.organization.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { users: true, departments: true, projects: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, logoUrl } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const existingOrg = await db.organization.findUnique({
      where: { slug }
    });

    if (existingOrg) {
      return NextResponse.json({ error: 'Organization with this slug already exists' }, { status: 409 });
    }

    const organization = await db.organization.create({
      data: {
        name,
        slug,
        description,
        logoUrl
      }
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}

// PUT /api/organizations - Update an organization
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, logoUrl, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const organization = await db.organization.update({
      where: { id },
      data: {
        name,
        description,
        logoUrl,
        isActive
      }
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

// DELETE /api/organizations - Delete an organization
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    await db.organization.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}
