import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface AboutDetailItem {
  gytagzId: number;
  name: string;
  title: string;
  context: string;
  attachment: string;
  createat: string;
}

// GET /api/about/[id] - 获取单个关于提案工作详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ID',
      }, { status: 400 });
    }

    const items = await query<AboutDetailItem[]>(`
      SELECT gytagzId, name, title, context, attachment, createat
      FROM gytagz
      WHERE gytagzId = ?
    `, [itemId]);

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Item not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: items[0],
    });
  } catch (error) {
    console.error('Error fetching about detail:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch about detail',
    }, { status: 500 });
  }
}
