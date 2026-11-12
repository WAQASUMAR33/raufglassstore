import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initBranchScope, resolveBranchId, mergeBranchWhere } from '@/lib/branch-server';

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope?.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;
    const all = searchParams.get('all') === 'true';

    if (id) {
      const cutter = await prisma.cutter.findUnique({
        where: { cutter_id: id }
      });
      if (!cutter) return errorResponse('Cutter not found', 404);
      return NextResponse.json(cutter);
    }

    let where = mergeBranchWhere(branchId, {});
    if (!all) {
      where.status = 'ACTIVE';
    }

    const cutters = await prisma.cutter.findMany({
      where,
      orderBy: [
        { cutter_name: 'asc' },
        { cutter_id: 'asc' }
      ]
    });

    return NextResponse.json(cutters);
  } catch (error) {
    console.error('Error fetching cutters:', error);
    return errorResponse('Failed to fetch cutters: ' + (error.message || 'Server error'), 500);
  }
}

export async function POST(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope?.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const body = await request.json();
    const { cutter_name, cutter_phone, notes, status } = body;

    if (!cutter_name || !cutter_name.trim()) {
      return errorResponse('Cutter name is required');
    }

    const newCutter = await prisma.cutter.create({
      data: {
        branch_id: branchId || 1,
        cutter_name: cutter_name.trim(),
        cutter_phone: cutter_phone?.trim() || null,
        notes: notes?.trim() || null,
        status: status || 'ACTIVE'
      }
    });

    return NextResponse.json(newCutter, { status: 201 });
  } catch (error) {
    console.error('Error creating cutter:', error);
    return errorResponse('Failed to create cutter: ' + (error.message || 'Server error'), 500);
  }
}

export async function PUT(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope?.error) return __branchScope.error;

  try {
    const body = await request.json();
    const { cutter_id, cutter_name, cutter_phone, notes, status } = body;

    const id = parseInt(cutter_id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return errorResponse('Valid cutter_id is required');
    }

    if (!cutter_name || !cutter_name.trim()) {
      return errorResponse('Cutter name is required');
    }

    const updated = await prisma.cutter.update({
      where: { cutter_id: id },
      data: {
        cutter_name: cutter_name.trim(),
        cutter_phone: cutter_phone?.trim() || null,
        notes: notes?.trim() || null,
        status: status || 'ACTIVE'
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating cutter:', error);
    return errorResponse('Failed to update cutter: ' + (error.message || 'Server error'), 500);
  }
}

export async function DELETE(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope?.error) return __branchScope.error;

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;

    if (!id) {
      try {
        const body = await request.json();
        id = parseInt(body.cutter_id || body.id, 10);
      } catch (e) {
        // ignore JSON parse error if no body
      }
    }

    if (!Number.isFinite(id) || id <= 0) {
      return errorResponse('Valid cutter_id is required for deletion');
    }

    await prisma.cutter.delete({
      where: { cutter_id: id }
    });

    return NextResponse.json({ success: true, message: 'Cutter deleted successfully' });
  } catch (error) {
    console.error('Error deleting cutter:', error);
    return errorResponse('Failed to delete cutter: ' + (error.message || 'Server error'), 500);
  }
}
