import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取提案分类列表
export async function GET() {
  try {
    const categories = await query<any[]>(
      'SELECT tajzlxId, tajzlxm FROM tajzlx WHERE isHidden = 0 ORDER BY tajzlxId'
    );

    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
