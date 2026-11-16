import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initBranchScope } from '@/lib/branch-server';
import { ensureAssetsSchema, getAssetsList, getTotalFixedAssets } from '@/lib/assets-helper';

export async function GET(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    await ensureAssetsSchema(prisma);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    const assets = await getAssetsList(prisma, { search, category, status });
    const { total: totalValue, count: activeCount } = await getTotalFixedAssets(prisma);

    // Compute category breakdown
    const categoryBreakdown = {};
    assets.forEach((a) => {
      const cat = a.category || 'Other';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, value: 0 };
      }
      categoryBreakdown[cat].count += 1;
      if (a.status === 'ACTIVE') {
        categoryBreakdown[cat].value += a.current_value;
      }
    });

    const totalCost = assets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);

    return NextResponse.json({
      assets,
      summary: {
        totalValue,
        totalCost,
        totalCount: assets.length,
        activeCount,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    await ensureAssetsSchema(prisma);
    const body = await request.json();
    const {
      asset_name,
      category = 'Other',
      purchase_date,
      purchase_cost = 0,
      current_value = 0,
      description = '',
      status = 'ACTIVE',
      created_by = null,
    } = body;

    if (!asset_name || !asset_name.trim()) {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 });
    }

    const pCost = parseFloat(purchase_cost) || 0;
    const cValue = parseFloat(current_value !== undefined && current_value !== null && current_value !== '' ? current_value : pCost);
    const pDate = purchase_date || new Date().toISOString().split('T')[0];

    await prisma.$executeRawUnsafe(
      `INSERT INTO assets (
        branch_id, asset_name, category, purchase_date, purchase_cost, current_value, description, status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      1,
      asset_name.trim(),
      category || 'Other',
      pDate,
      pCost,
      cValue,
      description?.trim() || null,
      status || 'ACTIVE',
      created_by || null,
      created_by || null
    );

    return NextResponse.json({ success: true, message: 'Asset added successfully' });
  } catch (error) {
    console.error('Error adding asset:', error);
    return NextResponse.json({ error: 'Failed to add asset' }, { status: 500 });
  }
}

export async function PUT(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    await ensureAssetsSchema(prisma);
    const body = await request.json();
    const {
      asset_id,
      asset_name,
      category = 'Other',
      purchase_date,
      purchase_cost = 0,
      current_value = 0,
      description = '',
      status = 'ACTIVE',
      updated_by = null,
    } = body;

    if (!asset_id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }
    if (!asset_name || !asset_name.trim()) {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 });
    }

    const pCost = parseFloat(purchase_cost) || 0;
    const cValue = parseFloat(current_value !== undefined && current_value !== null && current_value !== '' ? current_value : pCost);
    const pDate = purchase_date || new Date().toISOString().split('T')[0];

    await prisma.$executeRawUnsafe(
      `UPDATE assets SET
        asset_name = ?,
        category = ?,
        purchase_date = ?,
        purchase_cost = ?,
        current_value = ?,
        description = ?,
        status = ?,
        updated_by = ?
      WHERE asset_id = ?`,
      asset_name.trim(),
      category || 'Other',
      pDate,
      pCost,
      cValue,
      description?.trim() || null,
      status || 'ACTIVE',
      updated_by || null,
      parseInt(asset_id, 10)
    );

    return NextResponse.json({ success: true, message: 'Asset updated successfully' });
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    await ensureAssetsSchema(prisma);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      'DELETE FROM assets WHERE asset_id = ?',
      parseInt(id, 10)
    );

    return NextResponse.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}

