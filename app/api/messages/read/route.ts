import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PUT /api/messages/read - 标记消息为已读
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { msgIds } = body;

    if (!msgIds || !Array.isArray(msgIds) || msgIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'msgIds 不能为空',
      }, { status: 400 });
    }

    await query(`
      UPDATE message SET hasRead = 1 WHERE msgId IN (${msgIds.map(() => '?').join(',')})
    `, msgIds);

    return NextResponse.json({
      success: true,
      message: '标记成功',
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to mark messages as read',
    }, { status: 500 });
  }
}
