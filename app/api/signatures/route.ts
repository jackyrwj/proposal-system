import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取签名列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 获取总数
    const countResult = await query<any[]>(`SELECT COUNT(*) as total FROM signature`);
    const total = (countResult[0] as any)?.total || 0;

    // 获取签名列表
    const result = await query<any[]>(`
      SELECT * FROM signature
      ORDER BY sId DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
