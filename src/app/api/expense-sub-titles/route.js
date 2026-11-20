import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initBranchScope } from '@/lib/branch-server';

// GET - Fetch sub titles, optionally filtered by expense_title_id
export async function GET(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const { searchParams } = new URL(request.url);
    const expenseTitleId = searchParams.get('expense_title_id')
      ? parseInt(searchParams.get('expense_title_id'), 10)
      : null;
    const id = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;

    if (id) {
      const subTitle = await prisma.expenseSubTitle.findUnique({
        where: { id },
        include: {
          expense_title: true,
        },
      });

      if (!subTitle) {
        return NextResponse.json({ error: 'Expense sub-title not found' }, { status: 404 });
      }

      return NextResponse.json(subTitle);
    }

    const where = {};
    if (expenseTitleId) {
      where.expense_title_id = expenseTitleId;
    }

    const subTitles = await prisma.expenseSubTitle.findMany({
      where,
      include: {
        expense_title: {
          select: { id: true, title: true },
        },
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: { title: 'asc' },
    });

    return NextResponse.json(subTitles);
  } catch (error) {
    console.error('Error fetching expense sub-titles:', error);
    return NextResponse.json({ error: 'Failed to fetch expense sub-titles' }, { status: 500 });
  }
}

// POST - Create new sub title
export async function POST(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const body = await request.json();
    const { expense_title_id, title } = body;

    if (!expense_title_id) {
      return NextResponse.json({ error: 'Expense title ID is required' }, { status: 400 });
    }

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Sub-title is required' }, { status: 400 });
    }

    const titleId = parseInt(expense_title_id, 10);

    // Check if main title exists
    const mainTitle = await prisma.expenseTitle.findUnique({
      where: { id: titleId },
    });
    if (!mainTitle) {
      return NextResponse.json({ error: 'Parent expense title not found' }, { status: 404 });
    }

    // Check if sub-title already exists under this parent
    const existing = await prisma.expenseSubTitle.findFirst({
      where: {
        expense_title_id: titleId,
        title: title.trim(),
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Sub-title already exists for this expense title' }, { status: 400 });
    }

    const subTitle = await prisma.expenseSubTitle.create({
      data: {
        expense_title_id: titleId,
        title: title.trim(),
      },
      include: {
        expense_title: true,
      },
    });

    return NextResponse.json(subTitle, { status: 201 });
  } catch (error) {
    console.error('Error creating expense sub-title:', error);
    return NextResponse.json({ error: 'Failed to create expense sub-title' }, { status: 500 });
  }
}

// PUT - Update sub title
export async function PUT(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const body = await request.json();
    const { id, title, expense_title_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Sub-title ID is required' }, { status: 400 });
    }

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Sub-title is required' }, { status: 400 });
    }

    const subId = parseInt(id, 10);

    const existingSub = await prisma.expenseSubTitle.findUnique({
      where: { id: subId },
    });
    if (!existingSub) {
      return NextResponse.json({ error: 'Sub-title not found' }, { status: 404 });
    }

    const targetTitleId = expense_title_id ? parseInt(expense_title_id, 10) : existingSub.expense_title_id;

    // Check for duplicate title under same parent
    const duplicate = await prisma.expenseSubTitle.findFirst({
      where: {
        expense_title_id: targetTitleId,
        title: title.trim(),
        NOT: { id: subId },
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Another sub-title with this name already exists' }, { status: 400 });
    }

    const updated = await prisma.expenseSubTitle.update({
      where: { id: subId },
      data: {
        title: title.trim(),
        expense_title_id: targetTitleId,
      },
      include: {
        expense_title: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating expense sub-title:', error);
    return NextResponse.json({ error: 'Failed to update expense sub-title' }, { status: 500 });
  }
}

// DELETE - Delete sub title
export async function DELETE(request) {
  const __branchScope = await initBranchScope(request);
  if (__branchScope.error) return __branchScope.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ? parseInt(searchParams.get('id'), 10) : null;

    if (!id) {
      return NextResponse.json({ error: 'Sub-title ID is required' }, { status: 400 });
    }

    // Check if any expenses are using this sub-title
    const expenseCount = await prisma.expense.count({
      where: { sub_title_id: id },
    });

    if (expenseCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete sub-title. It has ${expenseCount} associated expense(s).` },
        { status: 400 }
      );
    }

    await prisma.expenseSubTitle.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Sub-title deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense sub-title:', error);
    return NextResponse.json({ error: 'Failed to delete expense sub-title' }, { status: 500 });
  }
}

