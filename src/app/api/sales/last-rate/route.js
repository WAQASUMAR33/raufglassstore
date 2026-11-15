import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cusId = searchParams.get('cus_id');
    const proId = searchParams.get('pro_id');

    if (!cusId || !proId) {
      return NextResponse.json({ last_rate: null });
    }

    const detail = await prisma.saleDetail.findFirst({
      where: {
        pro_id: parseInt(proId, 10),
        sale: {
          cus_id: parseInt(cusId, 10),
          bill_type: { in: ['BILL', 'ORDER'] }
        }
      },
      orderBy: {
        sale_detail_id: 'desc'
      },
      include: {
        sale: {
          select: {
            sale_id: true,
            date: true,
            bill_type: true
          }
        }
      }
    });

    if (!detail) {
      return NextResponse.json({ last_rate: null });
    }

    return NextResponse.json({
      last_rate: detail.unit_rate ? parseFloat(detail.unit_rate) : null,
      glass_rate: detail.glass_rate ? parseFloat(detail.glass_rate) : null,
      date: detail.sale?.date || null,
      sale_id: detail.sale?.sale_id || null,
      bill_type: detail.sale?.bill_type || null
    });
  } catch (error) {
    console.error('Error fetching last sale rate:', error);
    return NextResponse.json({ last_rate: null, error: error.message }, { status: 500 });
  }
}

