import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PUT /api/admin/xwdt/[id] - Update news
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ID',
      }, { status: 400 });
    }

    const body = await request.json();
    const { title, name, context } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (context !== undefined) {
      updates.push('context = ?');
      values.push(context);
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update',
      }, { status: 400 });
    }

    values.push(newsId);

    await query(`
      UPDATE xwdt
      SET ${updates.join(', ')}
      WHERE newsId = ?
    `, values);

    return NextResponse.json({
      success: true,
      message: 'News updated successfully',
    });
  } catch (error) {
    console.error('Error updating news:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update news',
    }, { status: 500 });
  }
}

// DELETE /api/admin/xwdt/[id] - Delete news
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newsId = parseInt(id);

    if (isNaN(newsId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ID',
      }, { status: 400 });
    }

    await query(`
      DELETE FROM xwdt
      WHERE newsId = ?
    `, [newsId]);

    return NextResponse.json({
      success: true,
      message: 'News deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete news',
    }, { status: 500 });
  }
}
