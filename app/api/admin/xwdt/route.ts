import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, name, context } = body;

    if (!title) {
      return NextResponse.json({
        success: false,
        error: '标题不能为空',
      }, { status: 400 });
    }

    const result = await query<{ insertId: number }[]>(`
      INSERT INTO news (title, name, context, createat)
      VALUES (?, ?, ?, ?)
    `, [title, name || '', context || '', getChinaTimeString()]);

    return NextResponse.json({
      success: true,
      data: { newsId: (result as any).insertId },
      message: '创建成功',
    });
  } catch (error) {
    console.error('Error creating news:', error);
    return NextResponse.json({
      success: false,
      error: '创建失败',
    }, { status: 500 });
  }
}
