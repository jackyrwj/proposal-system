import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface NewsDetail {
  newsId: number;
  title: string;
  name: string;
  context: string;
  createat: string;
}

// GET /api/news/[id] - 获取新闻详情
export async function GET(
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

    const news = await query<NewsDetail[]>(`
      SELECT newsId, title, name, context, createat
      FROM news
      WHERE newsId = ${newsId}
    `);

    if (news.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'News not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: news[0],
    });
  } catch (error) {
    console.error('Error fetching news detail:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch news detail',
    }, { status: 500 });
  }
}
