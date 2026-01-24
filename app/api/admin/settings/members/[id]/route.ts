import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * PUT /api/admin/settings/members/[id] - 更新成员
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, unit, position, year, phone, cardNo, mail } = body;

    if (!name || !cardNo) {
      return NextResponse.json({
        success: false,
        error: '姓名和校园卡号不能为空',
      }, { status: 400 });
    }

    await query(`
      UPDATE jdhmd
      SET id = ?, name = ?, depart = ?, phone = ?, mail = ?
      WHERE id = ?
    `, [cardNo, name, unit || '', phone || '', mail || '', id]);

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({
      success: false,
      error: '更新失败',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/settings/members/[id] - 删除成员
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await query(`DELETE FROM jdhmd WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({
      success: false,
      error: '删除失败',
    }, { status: 500 });
  }
}
