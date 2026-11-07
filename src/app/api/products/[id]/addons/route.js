import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initBranchScope, resolveBranchId } from '@/lib/branch-server';

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// GET /api/products/[id]/addons — Get all add-ons linked to this product
export async function GET(request, { params }) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const resolvedParams = await params;
    const proId = parseInt(resolvedParams.id, 10);
    if (!proId) return errorResponse('Valid Product ID is required');

    const product = await prisma.product.findFirst({
      where: { pro_id: proId, branch_id: branchId },
    });
    if (!product) return errorResponse('Product not found in this branch', 404);

    const productAddons = await prisma.productAddon.findMany({
      where: { product_id: proId },
      include: {
        addon: true,
      },
      orderBy: { id: 'asc' },
    });

    const addons = productAddons.map((pa) => ({
      product_addon_id: pa.id,
      ...pa.addon,
    }));

    return NextResponse.json(addons);
  } catch (err) {
    console.error('❌ Error fetching product add-ons:', err);
    return errorResponse('Failed to fetch product add-ons: ' + (err.message || 'Server error'), 500);
  }
}

// POST /api/products/[id]/addons — Sync or add add-ons to this product
// Body: { addon_ids: number[], mode?: 'sync' | 'append' }
export async function POST(request, { params }) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const resolvedParams = await params;
    const proId = parseInt(resolvedParams.id, 10);
    if (!proId) return errorResponse('Valid Product ID is required');

    const product = await prisma.product.findFirst({
      where: { pro_id: proId, branch_id: branchId },
    });
    if (!product) return errorResponse('Product not found in this branch', 404);

    const body = await request.json();
    const addonIds = Array.isArray(body.addon_ids) ? body.addon_ids.map((id) => parseInt(id, 10)).filter(Boolean) : [];
    const mode = body.mode || 'sync'; // 'sync' replaces all, 'append' adds to existing

    if (mode === 'sync') {
      await prisma.productAddon.deleteMany({
        where: { product_id: proId },
      });
    }

    if (addonIds.length > 0) {
      const inserts = addonIds.map((addonId) => ({
        product_id: proId,
        addon_id: addonId,
      }));
      await prisma.productAddon.createMany({
        data: inserts,
        skipDuplicates: true,
      });
    }

    const updated = await prisma.productAddon.findMany({
      where: { product_id: proId },
      include: { addon: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Product add-ons updated successfully',
      addons: updated.map((pa) => ({ product_addon_id: pa.id, ...pa.addon })),
    });
  } catch (err) {
    console.error('❌ Error updating product add-ons:', err);
    return errorResponse('Failed to update product add-ons: ' + (err.message || 'Server error'), 500);
  }
}

// DELETE /api/products/[id]/addons — Remove an add-on from this product
export async function DELETE(request, { params }) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const resolvedParams = await params;
    const proId = parseInt(resolvedParams.id, 10);
    const { searchParams } = new URL(request.url);
    const addonId = parseInt(searchParams.get('addon_id'), 10);

    if (!proId || !addonId) return errorResponse('Product ID and Addon ID are required');

    await prisma.productAddon.deleteMany({
      where: {
        product_id: proId,
        addon_id: addonId,
      },
    });

    return NextResponse.json({ success: true, message: 'Add-on disassociated from product' });
  } catch (err) {
    console.error('❌ Error removing product add-on:', err);
    return errorResponse('Failed to remove product add-on', 500);
  }
}

