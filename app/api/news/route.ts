import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface NewsItem {
  newsId: number;
  title: string;
  name: string;
  context: string;
  createat: string;
}

// GET /api/news - 获取工作动态列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const keyword = searchParams.get('keyword') || '';
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = '';
    let countWhereClause = '';
    if (keyword) {
      const escapedKeyword = keyword.replace(/'/g, "\\'");
      whereClause = `WHERE title LIKE '%${escapedKeyword}%' OR name LIKE '%${escapedKeyword}%'`;
      countWhereClause = `WHERE title LIKE '%${escapedKeyword}%' OR name LIKE '%${escapedKeyword}%'`;
    }

    const news = await query<NewsItem>(`
      SELECT newsId, title, name, createat
      FROM news
      ${whereClause}
      ORDER BY createat DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // 获取总数
    const [countResult] = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM news
      ${countWhereClause}
    `);

    return NextResponse.json({
      success: true,
      data: news,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch news',
    }, { status: 500 });
  }
}
