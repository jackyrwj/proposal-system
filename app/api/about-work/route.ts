import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取所有关于提案工作的内容
export async function GET() {
  try {
    const result = await query<any[]>(`
      SELECT * FROM gytagz ORDER BY gytagzId DESC
    `);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// 添加新内容
export async function POST(request: NextRequest) {
  try {
    const { name, title, context, attachment } = await request.json();

    if (!name?.trim() || !title?.trim() || !context?.trim()) {
      return NextResponse.json({
        success: false,
        error: '发布单位、标题和内容不能为空',
      }, { status: 400 });
    }

    // 获取当前时间
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');

    await query(
      `INSERT INTO gytagz (name, title, context, attachment, createat) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), title.trim(), context.trim(), attachment || null, now]
    );

    return NextResponse.json({
      success: true,
      message: '添加成功',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
