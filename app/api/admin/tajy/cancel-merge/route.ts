import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';

// POST /api/admin/tajy/cancel-merge - 取消合并提案
// 删除合并后的提案，并恢复源提案的状态
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mergedProposalId } = body;

    if (!mergedProposalId) {
      return NextResponse.json({
        success: false,
        error: '请提供合并提案ID',
      }, { status: 400 });
    }

    // 获取合并提案的信息
    const mergedProposals = await query<any[]>(`
      SELECT tajyId, description, createAt
      FROM tajy
      WHERE tajyId = ?
    `, [mergedProposalId]);

    if (!mergedProposals || mergedProposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未找到该合并提案',
      }, { status: 404 });
    }

    const mergedProposal = mergedProposals[0] as any;

    // 检查是否为AI合并生成的提案
    if (!mergedProposal.description || !mergedProposal.description.startsWith('AI合并来源:')) {
      return NextResponse.json({
        success: false,
        error: '该提案不是AI合并生成的，无法取消合并',
      }, { status: 400 });
    }

    // 解析源提案ID
    const sourceIdsStr = mergedProposal.description.replace('AI合并来源:', '');
    const sourceIds = sourceIdsStr.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));

    if (sourceIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无法找到源提案信息',
      }, { status: 400 });
    }

    console.log('[Cancel Merge] 取消合并提案:', mergedProposalId, '源提案:', sourceIds);

    // 恢复源提案的状态（将 process 从 1 改回 0）
    const updateResult = await query(`
      UPDATE tajy SET process = 0
      WHERE tajyId IN (${sourceIds.map(() => '?').join(',')})
    `, sourceIds);

    console.log('[Cancel Merge] 恢复了', (updateResult as any).affectedRows || sourceIds.length, '条源提案');

    // 删除合并提案
    await query(`
      DELETE FROM tajy WHERE tajyId = ?
    `, [mergedProposalId]);

    console.log('[Cancel Merge] 已删除合并提案:', mergedProposalId);

    return NextResponse.json({
      success: true,
      message: `已取消合并，恢复了 ${sourceIds.length} 条源提案`,
      data: {
        deletedProposalId: mergedProposalId,
        restoredProposalIds: sourceIds,
      },
    });
  } catch (error) {
    console.error('[Cancel Merge] Error:', error);
    return NextResponse.json({
      success: false,
      error: '取消合并失败',
    }, { status: 500 });
  }
}
