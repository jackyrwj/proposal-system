import { NextRequest, NextResponse } from 'next/server';
import { clearEmbeddingCache, getCacheStats } from '@/lib/rag';

// GET /api/rag/cache - 获取缓存状态
export async function GET() {
  try {
    const stats = getCacheStats();
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json({
      success: false,
      error: '获取缓存状态失败',
    }, { status: 500 });
  }
}

// DELETE /api/rag/cache - 清除缓存
export async function DELETE() {
  try {
    clearEmbeddingCache();
    return NextResponse.json({
      success: true,
      message: '缓存已清除',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json({
      success: false,
      error: '清除缓存失败',
    }, { status: 500 });
  }
}
