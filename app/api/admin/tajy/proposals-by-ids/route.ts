import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/admin/tajy/proposals-by-ids?ids=1,2,3 - 根据ID列表获取提案建议
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({
        success: false,
        error: '请提供提案ID列表',
      }, { status: 400 });
    }

    // 验证ID格式
    const idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (idArray.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无效的提案ID',
      }, { status: 400 });
    }

    // 查询提案
    const placeholders = idArray.map(() => '?').join(',');
    const proposals = await query<any[]>(`
      SELECT tajyId, tajybh, title, brief, depart, name, type, process, createAt, description
      FROM tajy
      WHERE tajyId IN (${placeholders})
      ORDER BY tajyId
    `, idArray);

    return NextResponse.json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    console.error('Error fetching proposals by IDs:', error);
    return NextResponse.json({
      success: false,
      error: '获取提案失败',
    }, { status: 500 });
  }
}
