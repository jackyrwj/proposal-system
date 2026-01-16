import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/wework/messages - 获取消息记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const studentID = searchParams.get('studentID');
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (studentID) {
      whereClause = 'WHERE studentID = ?';
      params.push(studentID);
    }

    const messages = await query(`
      SELECT id, studentID, templateId, Parameters, msgid, success, error, createdAt
      FROM wework_messages
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params);

    // 获取总数
    const [countResult] = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM wework_messages ${whereClause}
    `, params);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch messages',
    }, { status: 500 });
  }
}
