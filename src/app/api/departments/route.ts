/**
 * Departments API - CRUD operations for departments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/departments - List departments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const departmentId = searchParams.get('id');

    if (departmentId) {
      const department = await db.department.findUnique({
        where: { id: departmentId },
        include: {
          users: {
            select: { id: true, name: true, email: true, jobTitle: true }
          },
          projects: true,
          parentDept: true,
          subDepartments: true
        }
      });
      return NextResponse.json(department);
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const departments = await db.department.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { users: true, projects: true, subDepartments: true }
        },
        parentDept: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

// POST /api/departments - Create a new department
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, description, organizationId, parentDeptId, managerId, budget } = body;

    if (!name || !code || !organizationId) {
      return NextResponse.json({ error: 'Name, code, and organizationId are required' }, { status: 400 });
    }

    const department = await db.department.create({
      data: {
        name,
        code,
        description,
        organizationId,
        parentDeptId,
        managerId,
        budget
      }
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}

// PUT /api/departments - Update a department
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, parentDeptId, managerId, budget } = body;

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    const department = await db.department.update({
      where: { id },
      data: { name, description, parentDeptId, managerId, budget }
    });

    return NextResponse.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

// DELETE /api/departments - Delete a department
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 });
    }

    await db.department.delete({ where: { id } });
    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
