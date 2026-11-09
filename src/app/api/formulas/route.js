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
    const activeOnly = searchParams.get('active_only') === 'true';

    let where = mergeBranchWhere(branchId, {});
    if (activeOnly) {
      where.is_active = true;
    }

    const formulas = await prisma.formula.findMany({
      where,
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: [
        { is_default: 'desc' },
        { id: 'asc' }
      ]
    });

    return NextResponse.json(formulas);
  } catch (error) {
    console.error('Error fetching formulas:', error);
    return errorResponse('Failed to fetch formulas: ' + (error.message || 'Server error'), 500);
  }
}

export async function POST(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope?.error) return __branchScope.error;

  try {
    const branchId = resolveBranchId(request);
    const body = await request.json();

    const {
      name,
      description,
      tolerance = 0,
      width_steps,
      height_steps,
      min_width = 6,
      min_height = 6,
      divisor = 144,
      rounding_rule = 'SLAB_TIERS',
      is_default = false,
      is_active = true
    } = body;

    if (!name || !name.trim()) {
      return errorResponse('Formula name is required', 400);
    }

    if (!width_steps || !width_steps.trim()) {
      return errorResponse('Width steps are required', 400);
    }

    // If setting as default, reset previous default
    if (is_default) {
      await prisma.formula.updateMany({
        where: { branch_id: branchId, is_default: true },
        data: { is_default: false }
      });
    }

    const newFormula = await prisma.formula.create({
      data: {
        branch_id: branchId,
        name: name.trim(),
        description: description ? description.trim() : null,
        tolerance: parseFloat(tolerance) || 0,
        width_steps: width_steps.trim(),
        height_steps: height_steps && height_steps.trim() ? height_steps.trim() : null,
        min_width: parseFloat(min_width) || 6,
        min_height: parseFloat(min_height) || 6,
        divisor: parseFloat(divisor) || 144,
        rounding_rule: rounding_rule || 'SLAB_TIERS',
        is_default: Boolean(is_default),
        is_active: Boolean(is_active)
      }
    });

    return NextResponse.json(newFormula, { status: 201 });
  } catch (error) {
    console.error('Error creating formula:', error);
    return errorResponse(error.message || 'Failed to create formula', 500);
  }
}

export async function PUT(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope?.error) return __branchScope.error;

  try {
    const body = await request.json();
    const targetId = parseInt(body.id, 10);

    if (!targetId) {
      return errorResponse('Formula ID is required', 400);
    }

    const {
      name,
      description,
      tolerance,
      width_steps,
      height_steps,
      min_width,
      min_height,
      divisor,
      rounding_rule,
      is_default,
      is_active
    } = body;

    const existing = await prisma.formula.findUnique({
      where: { id: targetId }
    });

    if (!existing) {
      return errorResponse('Formula not found', 404);
    }

    if (is_default) {
      await prisma.formula.updateMany({
        where: { branch_id: existing.branch_id, is_default: true, id: { not: targetId } },
        data: { is_default: false }
      });
    }

    const updatedFormula = await prisma.formula.update({
      where: { id: targetId },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        tolerance: tolerance !== undefined ? parseFloat(tolerance) || 0 : existing.tolerance,
        width_steps: width_steps !== undefined ? width_steps.trim() : existing.width_steps,
        height_steps: height_steps !== undefined ? (height_steps && height_steps.trim() ? height_steps.trim() : null) : existing.height_steps,
        min_width: min_width !== undefined ? parseFloat(min_width) || 6 : existing.min_width,
        min_height: min_height !== undefined ? parseFloat(min_height) || 6 : existing.min_height,
        divisor: divisor !== undefined ? parseFloat(divisor) || 144 : existing.divisor,
        rounding_rule: rounding_rule !== undefined ? rounding_rule : existing.rounding_rule,
        is_default: is_default !== undefined ? Boolean(is_default) : existing.is_default,
        is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active
      }
    });

    return NextResponse.json(updatedFormula);
  } catch (error) {
    console.error('Error updating formula:', error);
    return errorResponse(error.message || 'Failed to update formula', 500);
  }
}

export async function DELETE(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope?.error) return __branchScope.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'), 10);

    if (!id) {
      return errorResponse('Formula ID is required', 400);
    }

    // Check if formula is linked to products
    const linkedProducts = await prisma.product.count({
      where: { formula_id: id }
    });

    if (linkedProducts > 0) {
      // Deactivate instead of deleting to protect data integrity
      await prisma.formula.update({
        where: { id },
        data: { is_active: false }
      });
      return NextResponse.json({
        message: `Formula deactivated because it is linked to ${linkedProducts} product(s).`
      });
    }

    await prisma.formula.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Formula deleted successfully' });
  } catch (error) {
    console.error('Error deleting formula:', error);
    return errorResponse(error.message || 'Failed to delete formula', 500);
  }
}
