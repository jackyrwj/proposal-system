import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface FormalProposalDetailItem {
  zstaId: number;
  zstabh: string;
  title: string;
  reason: string;
  suggest: string;
  management: string;
  attachment: string;
  process: number;
  reply: string;
  clickCount: number;
  createAt: string;
  sourceTajyIds?: string; // 原始提案建议ID列表
  allEndorsers?: string; // 所有子提案的附议人并集
}

// GET /api/formal-proposals/[id] - 获取单个正式提案详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposalId = parseInt(id);

    if (isNaN(proposalId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid proposal ID',
      }, { status: 400 });
    }

    const proposals = await query<FormalProposalDetailItem>(`
      SELECT
        zstaId, zstabh, title, reason, suggest, management,
        attachment, process, reply, clickCount, createAt, sourceTajyIds
      FROM zsta
      WHERE zstaId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Proposal not found',
      }, { status: 404 });
    }

    const proposal = proposals[0];

    // 获取所有子提案的附议人并集
    let allEndorsers = '';
    if (proposal.sourceTajyIds) {
      try {
        const sourceIds = JSON.parse(proposal.sourceTajyIds) as number[];
        if (Array.isArray(sourceIds) && sourceIds.length > 0) {
          // 查询所有子提案的附议人
          const tajyProposals = await query<{ fyr: string }>(`
            SELECT fyr FROM tajy WHERE tajyId IN (${sourceIds.map(() => '?').join(',')})
          `, sourceIds);

          // 收集所有附议人
          const endorserSet = new Set<string>();
          for (const p of tajyProposals) {
            if ((p as any).fyr) {
              const endorsers = (p as any).fyr.split('，').filter((e: string) => e.trim());
              endorsers.forEach((e: string) => endorserSet.add(e));
            }
          }

          // 按名称排序后合并
          allEndorsers = Array.from(endorserSet).sort((a, b) => {
            const nameA = a.replace(/\(.*/, '').trim();
            const nameB = b.replace(/\(.*/, '').trim();
            return nameA.localeCompare(nameB, 'zh-CN');
          }).join('，');
        }
      } catch (e) {
        console.error('Error parsing sourceTajyIds:', e);
      }
    }

    // 增加点击次数
    await query(`
      UPDATE zsta SET clickCount = clickCount + 1 WHERE zstaId = ?
    `, [proposalId]);

    return NextResponse.json({
      success: true,
      data: { ...proposal, allEndorsers },
    });
  } catch (error) {
    console.error('Error fetching formal proposal detail:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch proposal detail',
    }, { status: 500 });
  }
}

// DELETE /api/formal-proposals/[id] - 删除正式提案
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposalId = parseInt(id);

    if (isNaN(proposalId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid proposal ID',
      }, { status: 400 });
    }

    // 先检查提案是否存在
    const existing = await query<{ zstaId: number }[]>(`
      SELECT zstaId FROM zsta WHERE zstaId = ?
    `, [proposalId]);

    if (!existing || existing.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    // 删除提案
    await query(`
      DELETE FROM zsta WHERE zstaId = ?
    `, [proposalId]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Error deleting formal proposal:', error);
    return NextResponse.json({
      success: false,
      error: '删除失败',
    }, { status: 500 });
  }
}
