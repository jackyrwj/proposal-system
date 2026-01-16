import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/system - 获取系统参数
export async function GET() {
  try {
    // 获取系统参数
    const paramsResult = await query<{ enableSign: number; homeImage: string }>(`
      SELECT enableSign, homeImage FROM system_params LIMIT 1
    `);

    const params = paramsResult[0] || { enableSign: 1, homeImage: '' };

    return NextResponse.json({
      success: true,
      data: params,
    });
  } catch (error) {
    console.error('Error fetching system params:', error);
    return NextResponse.json({
      success: false,
      error: '获取参数失败',
    }, { status: 500 });
  }
}
