import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取所有类别
export async function GET() {
  try {
    // 从 tajzlx 表获取提案进展类型作为类别
    const result = await query<any[]>(`
      SELECT tajzlxId as id, tajzlxm as name, isHidden as isActive
      FROM tajzlx
      ORDER BY tajzlxId
    `);

    return NextResponse.json({
      success: true,
      data: result.map((row: any) => ({
        ...row,
        isActive: !row.isHidden,
        description: null,
        createdAt: null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// 添加新类别
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({
        success: false,
        error: '类别名称不能为空',
      }, { status: 400 });
    }

    await query(
      `INSERT INTO tajzlx (tajzlxm, isHidden) VALUES (?, 0)`,
      [name.trim()]
    );

    return NextResponse.json({
      success: true,
      message: '添加成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
