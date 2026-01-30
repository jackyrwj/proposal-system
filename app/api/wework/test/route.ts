import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, sendTemplateMessage } from '@/lib/wework';

// GET /api/wework/test - 测试获取 token
export async function GET() {
  console.log('[API-Test] GET 请求: 获取 token');
  try {
    const token = await getAccessToken();
    console.log('[API-Test] token 获取成功');
    return NextResponse.json({
      success: true,
      token: token.substring(0, 50) + '...', // 只返回部分 token 用于验证
      fullToken: token,
    });
  } catch (error) {
    console.error('[API-Test] token 获取失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}

// POST /api/wework/test - 测试发送消息
export async function POST(request: NextRequest) {
  console.log('[API-Test] POST 请求: 发送消息');
  try {
    const body = await request.json();
    console.log('[API-Test] 请求体:', body);
    const { studentID, type } = body;

    if (!studentID) {
      console.error('[API-Test] 缺少 studentID 参数');
      return NextResponse.json({
        success: false,
        error: '请提供 studentID',
      }, { status: 400 });
    }

    let result;

    if (type === 'submit') {
      // 测试提案提交通知 - 使用 sendTemplateMessage
      console.log('[API-Test] 发送提案提交通知');
      result = await sendTemplateMessage(
        'CUURWNXKM1', // 附议邀请模板ID
        [studentID],
        ['测试提案标题', '关于校园建设的建议', process.env.NEXT_PUBLIC_SITE_URL + '/proposals/1']
      );
    } else {
      // 默认发送测试模板消息
      console.log('[API-Test] 发送默认测试消息');
      result = await sendTemplateMessage(
        'CUURWNXKM1',
        [studentID],
        ['测试参数1', '测试参数2', '测试参数3']
      );
    }

    console.log('[API-Test] 发送结果:', result);
    return NextResponse.json({
      success: result.success,
      msgid: result.msgid,
      error: result.error,
    });
  } catch (error) {
    console.error('[API-Test] 处理异常:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
