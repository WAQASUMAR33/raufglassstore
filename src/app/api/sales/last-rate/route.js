import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cusId = searchParams.get('cus_id');
    const proId = searchParams.get('pro_id');

    if (!cusId || !proId) {
      return NextResponse.json({ last_rate: null });
    }

    const parsedCusId = parseInt(cusId, 10);
    const parsedProId = parseInt(proId, 10);

    if (isNaN(parsedCusId) || isNaN(parsedProId)) {
      return NextResponse.json({ last_rate: null });
    }

    const detail = await prisma.saleDetail.findFirst({
      where: {
        pro_id: parsedProId,
        sale: {
          cus_id: parsedCusId,
          bill_type: { in: ['BILL', 'ORDER', 'DISPATCHED'] }
        }
      },
      orderBy: {
        sale_detail_id: 'desc'
      },
      include: {
        sale: {
          select: {
            sale_id: true,
            bill_number: true,
            created_at: true,
            bill_type: true
          }
        }
      }
    });

    if (!detail) {
      return NextResponse.json({ last_rate: null });
    }

    const rate = detail.unit_rate ? parseFloat(detail.unit_rate) : null;

    return NextResponse.json({
      last_rate: rate,
      unit_rate: rate,
      date: detail.sale?.created_at || null,
      sale_id: detail.sale?.sale_id || null,
      bill_number: detail.sale?.bill_number || detail.sale?.sale_id || null,
      bill_type: detail.sale?.bill_type || null
    });
  } catch (error) {
    console.error('Error fetching last sale rate:', error);
    return NextResponse.json({ last_rate: null, error: error.message }, { status: 500 });
  }
}

