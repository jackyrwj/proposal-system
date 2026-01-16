import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/public/params - 获取公开的系统参数
export async function GET() {
  try {
    // 获取系统参数（从 system_params 表读取）
    const params = await query<any[]>(`
      SELECT enableSign, homeImage
      FROM system_params
      LIMIT 1
    `);

    if (!params || params.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          enableSign: 1,
          homeImage: '',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        enableSign: (params[0] as any)?.enableSign ?? 1,
        homeImage: (params[0] as any)?.homeImage || '',
      },
    });
  } catch (error) {
    console.error('Error fetching public params:', error);
    return NextResponse.json({
      success: true,
      data: {
        enableSign: 1,
        homeImage: '',
      },
    });
  }
}
