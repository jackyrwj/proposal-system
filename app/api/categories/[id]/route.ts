import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 更新类别
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, description, isActive } = await request.json();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (!name || !name.trim()) {
      return NextResponse.json({
        success: false,
        error: '类别名称不能为空',
      }, { status: 400 });
    }

    await query(
      `UPDATE tajzlx SET tajzlxm = ?, isHidden = ? WHERE tajzlxId = ?`,
      [name.trim(), isActive ? 0 : 1, id]
    );

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// 删除类别
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await query(`DELETE FROM tajzlx WHERE tajzlxId = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
