import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/debug/settings - 调试系统参数
export async function GET() {
  try {
    // 检查 system_params 表
    const systemParams = await query<any[]>(`
      SELECT * FROM system_params LIMIT 1
    `);

    // 检查 xtpcs 表
    const xtpcsParams = await query<any[]>(`
      SELECT * FROM xtpcs LIMIT 1
    `);

    return NextResponse.json({
      success: true,
      data: {
        system_params: systemParams,
        xtpcs: xtpcsParams,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
