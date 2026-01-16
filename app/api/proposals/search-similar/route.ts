import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { semanticSearch, checkEmbeddingService } from '@/lib/rag';

// GET /api/proposals/search-similar - 使用 RAG 语义搜索类似提案
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title')?.trim();

    console.log('[RAG Search] 开始搜索:', title);

    if (!title) {
      return NextResponse.json({
        success: false,
        error: '请提供标题',
      }, { status: 400 });
    }

    // 检查 Embedding 服务是否可用
    const embeddingCheck = await checkEmbeddingService();
    if (!embeddingCheck.available) {
      console.log('[RAG Search] Embedding 服务不可用:', embeddingCheck.message);
      // 直接降级为关键词搜索，不返回错误
      console.log('[RAG Search] 降级为关键词搜索...');
      const [tajyResults, zstaResults] = await Promise.all([
        query<any[]>(`
          SELECT 'tajy' as proposalType, tajyId, tajybh, title, brief, createAt
          FROM tajy
          WHERE title LIKE ?
          ORDER BY createAt DESC
          LIMIT 10
        `, [`%${title}%`]),
        query<any[]>(`
          SELECT 'zsta' as proposalType, zstaId as tajyId,
                 CAST(zstabh as UNSIGNED) as tajybh,
                 title, reason as brief, createAt
          FROM zsta
          WHERE title LIKE ?
          ORDER BY createAt DESC
          LIMIT 10
        `, [`%${title}%`]),
      ]);

      return NextResponse.json({
        success: true,
        data: [...tajyResults, ...zstaResults].map(p => ({ ...p, similarity: 0 })),
        method: 'fallback',
        message: embeddingCheck.message,
      });
    }
    console.log('[RAG Search] Embedding 服务可用');

    // 并行获取两种类型的提案
    console.log('[RAG Search] 开始从数据库获取提案...');
    const [tajyProposals, zstaProposals] = await Promise.all([
      // 提案建议（tajy）
      query<any[]>(`
        SELECT
          'tajy' as proposalType,
          tajyId as id,
          tajyId,
          tajybh,
          title,
          brief,
          context,
          analysis,
          suggest,
          createAt
        FROM tajy
        WHERE tajyId IS NOT NULL AND title IS NOT NULL
        ORDER BY createAt DESC
        LIMIT 500
      `),
      // 正式提案（zsta）
      query<any[]>(`
        SELECT
          'zsta' as proposalType,
          zstaId as id,
          zstaId as tajyId,
          CAST(zstabh as UNSIGNED) as tajybh,
          title,
          reason as brief,
          NULL as context,
          reason as analysis,
          suggest,
          createAt
        FROM zsta
        WHERE zstaId IS NOT NULL AND title IS NOT NULL
        ORDER BY createAt DESC
        LIMIT 500
      `),
    ]);

    console.log('[RAG Search] 获取到提案数量 - tajy:', tajyProposals.length, 'zsta:', zstaProposals.length);

    // 合并所有提案
    const allProposals = [...tajyProposals, ...zstaProposals];

    if (allProposals.length === 0) {
      console.log('[RAG Search] 没有找到任何提案');
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 使用 RAG 语义搜索
    console.log('[RAG Search] 开始调用语义搜索...');
    const startTime = Date.now();
    const results = await semanticSearch(title, allProposals, 10);
    const elapsed = Date.now() - startTime;
    console.log('[RAG Search] 语义搜索完成，耗时:', elapsed, 'ms，结果数:', results.length);

    return NextResponse.json({
      success: true,
      data: results,
      method: 'rag',
    });
  } catch (error) {
    console.error('[RAG Search] 错误:', error);
    console.error('[RAG Search] 错误堆栈:', error instanceof Error ? error.stack : 'No stack');

    // 如果 RAG 搜索失败，降级为简单的关键词搜索
    try {
      console.log('[RAG Search] 尝试降级为关键词搜索...');
      const { searchParams } = new URL(request.url);
      const title = searchParams.get('title')?.trim();

      if (title) {
        const [tajyResults, zstaResults] = await Promise.all([
          query<any[]>(`
            SELECT 'tajy' as proposalType, tajyId, tajybh, title, brief, createAt
            FROM tajy
            WHERE title LIKE ?
            ORDER BY createAt DESC
            LIMIT 10
          `, [`%${title}%`]),
          query<any[]>(`
            SELECT 'zsta' as proposalType, zstaId as tajyId,
                   CAST(zstabh as UNSIGNED) as tajybh,
                   title, reason as brief, createAt
            FROM zsta
            WHERE title LIKE ?
            ORDER BY createAt DESC
            LIMIT 10
          `, [`%${title}%`]),
        ]);

        console.log('[RAG Search] 降级搜索完成，结果数:', tajyResults.length + zstaResults.length);

        return NextResponse.json({
          success: true,
          data: [...tajyResults, ...zstaResults].map(p => ({ ...p, similarity: 0 })),
          method: 'fallback',
          message: '语义搜索不可用，已降级为关键词搜索',
        });
      }
    } catch (fallbackError) {
      console.error('[RAG Search] 降级搜索也失败:', fallbackError);
    }

    return NextResponse.json({
      success: false,
      error: '搜索失败，请稍后重试',
    }, { status: 500 });
  }
}
