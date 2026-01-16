import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 更新内容
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, title, context, attachment } = await request.json();
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (!name?.trim() || !title?.trim() || !context?.trim()) {
      return NextResponse.json({
        success: false,
        error: '发布单位、标题和内容不能为空',
      }, { status: 400 });
    }

    await query(
      `UPDATE gytagz SET name = ?, title = ?, context = ?, attachment = ? WHERE gytagzId = ?`,
      [name.trim(), title.trim(), context.trim(), attachment || null, id]
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

// 删除内容
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    await query(`DELETE FROM gytagz WHERE gytagzId = ?`, [id]);

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
