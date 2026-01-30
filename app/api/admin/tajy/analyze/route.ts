import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { analyzeProposals, checkAIService } from '@/lib/ai';

// GET /api/admin/tajy/analyze - 分析提案建议并返回可合并的分组
export async function GET(request: NextRequest) {
  try {
    console.log('[API Analyze] 开始处理分析请求');

    // 首先检查 AI 服务是否可用
    const aiCheck = await checkAIService();
    console.log('[API Analyze] AI服务检查结果:', aiCheck);

    if (!aiCheck.available) {
      return NextResponse.json({
        success: false,
        error: aiCheck.message,
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 可选筛选：0=未审核, 1=已立案, 2=不立案, 3=处理中
    const startDate = searchParams.get('startDate'); // 可选筛选：开始日期
    const endDate = searchParams.get('endDate'); // 可选筛选：结束日期

    // 获取所有未被合并的提案建议（可以根据状态和日期筛选）
    let whereClause = 'WHERE tajyId NOT IN (';
    whereClause += '  SELECT CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(zsta.sourceTajyIds, ",", numbers.n), ",", -1) AS UNSIGNED)';
    whereClause += '  FROM zsta';
    whereClause += '  CROSS JOIN (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) numbers';
    whereClause += '  WHERE zsta.sourceTajyIds IS NOT NULL';
    whereClause += '    AND zsta.sourceTajyIds != ""';
    whereClause += '    AND numbers.n <= LENGTH(zsta.sourceTajyIds) - LENGTH(REPLACE(zsta.sourceTajyIds, ",", "")) + 1';
    whereClause += ')';

    // 可选的状态筛选
    const params: any[] = [];
    if (status !== null && status !== '' && !isNaN(parseInt(status))) {
      whereClause += ' AND process = ?';
      params.push(parseInt(status));
    }

    // 可选的日期范围筛选
    if (startDate && startDate.trim() !== '') {
      whereClause += ' AND DATE(createAt) >= ?';
      params.push(startDate);
    }
    if (endDate && endDate.trim() !== '') {
      whereClause += ' AND DATE(createAt) <= ?';
      params.push(endDate);
    }

    const proposals = await query<any[]>(`
      SELECT tajyId, tajybh, title, brief, context, analysis, suggest, management, depart, name
      FROM tajy
      ${whereClause}
      ORDER BY tajyId DESC
      LIMIT 50
    `, params);

    console.log('[API Analyze] 查询到的提案数量:', proposals?.length || 0);

    if (!proposals || proposals.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          groups: [],
          message: proposals?.length === 0 ? '暂无待分析的提案建议' : '可分析的提案数量不足（至少需要2条）',
        },
      });
    }

    // 调用 AI 分析
    console.log('[API Analyze] 开始调用AI分析...');
    const groups = await analyzeProposals(proposals as any[]);
    console.log('[API Analyze] AI分析完成，分组数量:', groups.length);

    return NextResponse.json({
      success: true,
      data: {
        groups,
        totalProposals: proposals.length,
        message: `找到 ${groups.length} 组可合并的提案`,
      },
    });
  } catch (error) {
    console.error('[API Analyze] Error analyzing proposals:', error);
    return NextResponse.json({
      success: false,
      error: '分析失败',
    }, { status: 500 });
  }
}
