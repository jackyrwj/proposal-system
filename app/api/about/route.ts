import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface AboutItem {
  gytagzId: number;
  name: string;
  title: string;
  context: string;
  attachment: string;
  createat: string;
}

// GET /api/about - 获取关于提案工作列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const items = await query<AboutItem[]>(`
      SELECT gytagzId, name, title, context, attachment, createat
      FROM gytagz
      ORDER BY gytagzId DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // 获取总数
    const [countResult] = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM gytagz
    `);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching about items:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch about items',
    }, { status: 500 });
  }
}
