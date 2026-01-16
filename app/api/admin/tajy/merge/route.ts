import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';
import { mergeProposals as aiMergeProposals, checkAIService } from '@/lib/ai';

// 用于跟踪请求ID
let requestIdCounter = 0;

// 获取当前时间减去指定秒数的字符串（用于防止重复提交检查）
function getTimeBeforeSeconds(seconds: number): string {
  const now = new Date();
  const beforeTime = new Date(now.getTime() + (8 * 60 * 60 * 1000) - (seconds * 1000));
  return beforeTime.toISOString().replace('T', ' ').substring(0, 19);
}

// POST /api/admin/tajy/merge - 合并提案建议为新的提案建议
// previewOnly=true 时仅返回预览，不插入数据库
export async function POST(request: NextRequest) {
  const requestId = ++requestIdCounter;
  const startTime = Date.now();

  try {
    console.log(`[Merge API ${requestId}] 开始处理请求`);

    const body = await request.json();
    const { proposalIds, mergeResult: userProvidedResult, previewOnly } = body;

    console.log(`[Merge API ${requestId}] 收到的提案IDs:`, proposalIds, `previewOnly: ${previewOnly}`);

    if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length < 2) {
      return NextResponse.json({
        success: false,
        error: '请至少选择 2 条提案建议进行合并',
      }, { status: 400 });
    }

    // 仅预览模式：跳过重复检查，直接返回 AI 生成的结果
    if (previewOnly) {
      console.log(`[Merge API ${requestId}] 预览模式，跳过数据库操作`);

      // 检查 AI 服务是否可用
      const aiCheck = await checkAIService();
      if (!aiCheck.available && !userProvidedResult) {
        return NextResponse.json({
          success: false,
          error: aiCheck.message,
        }, { status: 503 });
      }

      // 获取提案详情
      const ids = proposalIds.join(',');
      const proposals = await query<any[]>(`
        SELECT tajyId, tajybh, title, brief, context, analysis, suggest, management, depart, name
        FROM tajy
        WHERE tajyId IN (${ids})
        ORDER BY tajyId
      `);

      if (!proposals || proposals.length === 0) {
        return NextResponse.json({
          success: false,
          error: '未找到选中的提案建议',
        }, { status: 404 });
      }

      // 使用用户提供的结果或调用 AI 生成
      let mergeResult = userProvidedResult;
      if (!mergeResult) {
        console.log(`[Merge API ${requestId}] 调用 AI 生成合并结果（预览）`);
        mergeResult = await aiMergeProposals(proposals as any[]);
      }

      console.log(`[Merge API ${requestId}] 预览生成完成`);
      return NextResponse.json({
        success: true,
        data: mergeResult,
        preview: true,
      });
    }

    // 正式提交模式：检查重复并插入数据库
    // 防止重复提交：检查最近10秒内是否已经合并过相同的提案
    const sortedIds = [...proposalIds].sort((a, b) => a - b).join(',');
    const sourceInfo = `AI合并来源:${sortedIds}`;
    const timeBefore10Seconds = getTimeBeforeSeconds(10);

    console.log(`[Merge API ${requestId}] 正式提交模式，检查重复提交，sourceInfo:`, sourceInfo);

    const recentDuplicate = await query<any[]>(`
      SELECT tajyId, createAt
      FROM tajy
      WHERE description = ?
        AND createAt >= ?
      LIMIT 1
    `, [sourceInfo, timeBefore10Seconds]);

    if (recentDuplicate && recentDuplicate.length > 0) {
      console.log(`[Merge API ${requestId}] 检测到重复提交，拒绝请求`);
      return NextResponse.json({
        success: false,
        error: '请勿重复提交，相同的提案刚刚已经合并过了',
      }, { status: 429 });
    }

    // 检查 AI 服务是否可用
    const aiCheck = await checkAIService();
    if (!aiCheck.available && !userProvidedResult) {
      return NextResponse.json({
        success: false,
        error: aiCheck.message,
      }, { status: 503 });
    }

    // 获取提案详情
    const ids = proposalIds.join(',');
    const proposals = await query<any[]>(`
      SELECT tajyId, tajybh, title, brief, context, analysis, suggest, management, depart, name
      FROM tajy
      WHERE tajyId IN (${ids})
      ORDER BY tajyId
    `);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未找到选中的提案建议',
      }, { status: 404 });
    }

    console.log(`[Merge API ${requestId}] 查询到 ${proposals.length} 条提案`);

    // 使用用户提供的结果或调用 AI 生成
    let mergeResult = userProvidedResult;
    if (!mergeResult) {
      console.log(`[Merge API ${requestId}] 调用 AI 生成合并结果`);
      mergeResult = await aiMergeProposals(proposals as any[]);
    }

    console.log(`[Merge API ${requestId}] 合并结果标题:`, mergeResult.title?.substring(0, 50));
    console.log(`[Merge API ${requestId}] 合并结果建议长度:`, mergeResult.suggest?.length || 0);
    console.log(`[Merge API ${requestId}] 合并结果建议类型:`, typeof mergeResult.suggest);

    // 生成新的提案建议编号
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const year = chinaTime.getFullYear();
    const countResult = await query<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM tajy
      WHERE YEAR(createAt) = ?
    `, [year]);

    const count = (countResult[0]?.count || 0) + 1;
    const tajybh = year * 1000 + count; // 格式: 2025001

    console.log(`[Merge API ${requestId}] 生成提案编号:`, tajybh);

    // 插入新的提案建议
    const result = await query<{ insertId: number }[]>(`
      INSERT INTO tajy (
        tajybh, title, brief, analysis, suggest, management,
        depart, name, type, process, description, createAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, [
      tajybh,
      mergeResult.title,
      mergeResult.reason, // 案由存入 brief
      mergeResult.reason, // 案由也存入 analysis
      mergeResult.suggest,
      mergeResult.management,
      '系统管理员', // 合并的提案默认为管理员提交
      '系统管理员',
      1, // 个人提案
      sourceInfo, // 记录源提案ID
      getChinaTimeString(),
    ]);

    console.log(`[Merge API ${requestId}] 插入成功，新提案ID:`, (result as any).insertId);

    // 更新源提案建议的状态为"已立案"（表示已被合并使用）
    await query(`
      UPDATE tajy SET process = 1
      WHERE tajyId IN (${ids}) AND process = 0
    `);

    const elapsed = Date.now() - startTime;
    console.log(`[Merge API ${requestId}] 请求完成，耗时: ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      data: {
        tajyId: (result as any).insertId,
        tajybh,
        ...mergeResult,
        sourceProposalIds: proposalIds,
      },
      message: `成功合并 ${proposalIds.length} 条提案建议，已生成新的提案建议待审核`,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Merge API ${requestId}] 请求失败，耗时: ${elapsed}ms，错误:`, error);
    return NextResponse.json({
      success: false,
      error: '合并失败',
    }, { status: 500 });
  }
}
