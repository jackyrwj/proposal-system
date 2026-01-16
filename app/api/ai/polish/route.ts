import { NextRequest, NextResponse } from 'next/server';
import { polishText } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, fieldType } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'text 字段不能为空',
      }, { status: 400 });
    }

    if (!fieldType || !['brief', 'analysis', 'suggest'].includes(fieldType)) {
      return NextResponse.json({
        success: false,
        error: 'fieldType 必须是 brief、analysis 或 suggest 之一',
      }, { status: 400 });
    }

    if (text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '输入内容为空',
      }, { status: 400 });
    }

    const result = await polishText(text, fieldType);

    return NextResponse.json({
      success: true,
      data: result.polished,
    });
  } catch (error) {
    console.error('AI Polish Error:', error);

    // 根据错误类型返回不同的状态码和消息
    const errorMessage = error instanceof Error ? error.message : '润色失败';

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}
