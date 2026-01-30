import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/messages/unread - 获取未读消息数量
export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取用户信息
    const getCookie = (name: string) => {
      const cookieHeader = request.headers.get('cookie');
      if (!cookieHeader) return null;
      const value = `; ${cookieHeader}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const userStr = getCookie('user');
    if (!userStr) {
      return NextResponse.json({
        success: true,
        count: 0,
      });
    }

    // 解码 URL 编码的 cookie 值
    const user = JSON.parse(decodeURIComponent(userStr));
    const cardId = user.id;
    const stuid = user.stuid;

    // 查询条件：使用 cardId 或 stuid 匹配未读消息
    let whereClause = 'WHERE (cardId = ?';
    const params: any[] = [cardId];

    // 如果用户有 stuid，也匹配 stuid
    if (stuid && stuid !== cardId) {
      whereClause += ' OR cardId = ?';
      params.push(stuid);
    }
    whereClause += ') AND hasRead = 0';

    const [result] = await query<{ count: number }[]>(`
      SELECT COUNT(*) as count FROM message ${whereClause}
    `, params);

    return NextResponse.json({
      success: true,
      count: (result as any)?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch unread count',
    }, { status: 500 });
  }
}
