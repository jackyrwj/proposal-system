import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 更新签名状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAgree } = await request.json();
    const resolvedParams = await params;
    const sId = parseInt(resolvedParams.id);

    await query(
      `UPDATE signature SET isAgree = ? WHERE sId = ?`,
      [isAgree, sId]
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

// 删除签名
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sId = parseInt(resolvedParams.id);

    await query(`DELETE FROM signature WHERE sId = ?`, [sId]);

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
