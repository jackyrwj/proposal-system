import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getChinaTimeString } from '@/lib/db';

export interface MessageItem {
  msgId: number;
  cardId: string;
  informType: number;
  context: string;
  hasRead: number;
  time: string;
}

// GET /api/messages - 获取当前用户的站内信
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
        success: false,
        error: '未登录',
      }, { status: 401 });
    }

    // 解码 URL 编码的 cookie 值
    const user = JSON.parse(decodeURIComponent(userStr));
    const cardId = user.id;
    const stuid = user.stuid;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // 查询条件：使用 cardId 或 stuid 匹配
    let whereClause = 'WHERE (cardId = ?';
    const params: any[] = [cardId];

    // 如果用户有 stuid，也匹配 stuid
    if (stuid && stuid !== cardId) {
      whereClause += ' OR cardId = ?';
      params.push(stuid);
    }
    whereClause += ')';

    if (unreadOnly) {
      whereClause += ' AND hasRead = 0';
    }

    const messages = await query<MessageItem>(`
      SELECT msgId, cardId, informType, context, hasRead, time
      FROM message
      ${whereClause}
      ORDER BY msgId DESC
    `, params);

    // 解析 context JSON
    const parsedMessages = messages.map(msg => {
      let context = null;
      if (msg.context) {
        try {
          // 尝试解析 JSON
          context = JSON.parse(msg.context);
        } catch {
          // 如果解析失败，说明是纯文本，直接作为 content
          context = {
            title: '系统消息',
            content: msg.context,
          };
        }
      }
      return {
        ...msg,
        context,
      };
    });

    return NextResponse.json({
      success: true,
      data: parsedMessages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch messages',
    }, { status: 500 });
  }
}

// POST /api/messages - 发送站内信
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardIds, informType, context } = body;

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'cardIds 不能为空',
      }, { status: 400 });
    }

    if (informType === undefined) {
      return NextResponse.json({
        success: false,
        error: 'informType 不能为空',
      }, { status: 400 });
    }

    if (!context) {
      return NextResponse.json({
        success: false,
        error: 'context 不能为空',
      }, { status: 400 });
    }

    const timeStr = getChinaTimeString();
    const contextStr = typeof context === 'string' ? context : JSON.stringify(context);

    // 批量插入消息
    const values = cardIds.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = cardIds.flatMap(cardId => [
      cardId,
      informType,
      contextStr,
      0, // hasRead = 0 未读
      timeStr,
    ]);

    await query(`
      INSERT INTO message (cardId, informType, context, hasRead, time)
      VALUES ${values}
    `, params);

    return NextResponse.json({
      success: true,
      message: '站内信发送成功',
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send message',
    }, { status: 500 });
  }
}

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
