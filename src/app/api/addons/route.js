import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initBranchScope, resolveBranchId, resolveUpdatedByUserId, mergeBranchWhere } from '@/lib/branch-server';

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ========================================
// GET — Fetch all add-ons or single add-on
// ========================================
export async function GET(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const status = searchParams.get('status') || '';

    if (id) {
      const addon = await prisma.addon.findFirst({
        where: { id, branch_id: branchId },
        include: {
          creator: {
            select: { user_id: true, full_name: true, email: true },
          },
          updater: {
            select: { user_id: true, full_name: true, email: true },
          },
          product_addons: {
            include: {
              product: {
                select: {
                  pro_id: true,
                  pro_title: true,
                  pro_sale_price: true,
                  pro_unit: true,
                },
              },
            },
          },
          _count: {
            select: { product_addons: true },
          },
        },
      });

      if (!addon) return errorResponse('Add-on not found', 404);
      return NextResponse.json(addon);
    }

    let whereClause = mergeBranchWhere(branchId, {});

    if (status && status !== 'all') {
      whereClause.status = status.toUpperCase();
    }

    if (search.trim()) {
      const query = search.trim();
      whereClause.OR = [
        { name: { contains: query } },
        { short_code: { contains: query } },
      ];
    }

    const addons = await prisma.addon.findMany({
      where: whereClause,
      include: {
        creator: {
          select: { user_id: true, full_name: true, email: true },
        },
        updater: {
          select: { user_id: true, full_name: true, email: true },
        },
        _count: {
          select: { product_addons: true },
        },
      },
      orderBy: [{ status: 'asc' }, { id: 'desc' }],
    });

    return NextResponse.json(addons);
  } catch (err) {
    console.error('❌ Error fetching add-ons:', err);
    return errorResponse('Failed to fetch add-ons: ' + (err.message || 'Server error'), 500);
  }
}

// ========================================
// POST — Create a new add-on
// ========================================
export async function POST(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const body = await request.json();
    const { name, short_code, cost_price, sale_price, status } = body;

    if (!name || !name.trim()) {
      return errorResponse('Add-on name is required');
    }

    // Check duplicate name within the branch
    const existing = await prisma.addon.findFirst({
      where: {
        branch_id: branchId,
        name: { equals: name.trim() },
      },
    });

    if (existing) {
      return errorResponse('An add-on with this name already exists in this branch', 409);
    }

    const userId = await resolveUpdatedByUserId(request, body.created_by);

    const costNum = parseFloat(cost_price || 0) || 0;
    const saleNum = parseFloat(sale_price || 0) || 0;
    const statusVal = status ? String(status).toUpperCase() : 'ACTIVE';

    const newAddon = await prisma.addon.create({
      data: {
        branch_id: branchId,
        name: name.trim(),
        short_code: short_code ? short_code.trim().toUpperCase() : null,
        cost_price: costNum,
        sale_price: saleNum,
        status: statusVal === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        created_by: userId,
        updated_by: userId,
      },
      include: {
        creator: {
          select: { user_id: true, full_name: true, email: true },
        },
        updater: {
          select: { user_id: true, full_name: true, email: true },
        },
      },
    });

    return NextResponse.json(newAddon, { status: 201 });
  } catch (err) {
    console.error('❌ Error creating add-on:', err);
    return errorResponse('Failed to create add-on: ' + (err.message || 'Server error'), 500);
  }
}

// ========================================
// PUT — Update an existing add-on
// ========================================
export async function PUT(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const body = await request.json();
    const { id, name, short_code, cost_price, sale_price, status } = body;

    const addonId = parseInt(id, 10);
    if (!addonId) return errorResponse('Valid Add-on ID is required');

    const currentAddon = await prisma.addon.findFirst({
      where: { id: addonId, branch_id: branchId },
    });

    if (!currentAddon) return errorResponse('Add-on not found in this branch', 404);

    if (name && name.trim()) {
      const duplicate = await prisma.addon.findFirst({
        where: {
          branch_id: branchId,
          name: { equals: name.trim() },
          id: { not: addonId },
        },
      });
      if (duplicate) {
        return errorResponse('Another add-on with this name already exists', 409);
      }
    }

    const userId = await resolveUpdatedByUserId(request, body.updated_by);

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (short_code !== undefined) updateData.short_code = short_code ? short_code.trim().toUpperCase() : null;
    if (cost_price !== undefined) updateData.cost_price = parseFloat(cost_price) || 0;
    if (sale_price !== undefined) updateData.sale_price = parseFloat(sale_price) || 0;
    if (status !== undefined) {
      updateData.status = String(status).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }
    if (userId) updateData.updated_by = userId;

    const updatedAddon = await prisma.addon.update({
      where: { id: addonId },
      data: updateData,
      include: {
        creator: {
          select: { user_id: true, full_name: true, email: true },
        },
        updater: {
          select: { user_id: true, full_name: true, email: true },
        },
        _count: {
          select: { product_addons: true },
        },
      },
    });

    return NextResponse.json(updatedAddon);
  } catch (err) {
    console.error('❌ Error updating add-on:', err);
    return errorResponse('Failed to update add-on: ' + (err.message || 'Server error'), 500);
  }
}

// ========================================
// DELETE — Delete an add-on
// ========================================
export async function DELETE(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id ? parseInt(body.id, 10) : null;
    }

    if (!id) return errorResponse('Valid Add-on ID is required');

    const addon = await prisma.addon.findFirst({
      where: { id, branch_id: branchId },
    });

    if (!addon) return errorResponse('Add-on not found in this branch', 404);

    // Remove any associations in product_addons first
    await prisma.productAddon.deleteMany({
      where: { addon_id: id },
    });

    // Delete the add-on
    await prisma.addon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Add-on deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting add-on:', err);
    return errorResponse('Failed to delete add-on: ' + (err.message || 'Server error'), 500);
  }
}

