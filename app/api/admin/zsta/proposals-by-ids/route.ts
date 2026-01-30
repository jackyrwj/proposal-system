import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/admin/zsta/proposals-by-ids?ids=1,2,3 - 根据ID列表获取正式提案
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({
        success: false,
        error: '请提供提案ID列表',
      }, { status: 400 });
    }

    // 验证ID格式
    const idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (idArray.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无效的提案ID',
      }, { status: 400 });
    }

    // 查询正式提案
    const placeholders = idArray.map(() => '?').join(',');
    type ZstaProposal = {
      zstaId: number;
      zstabh: number;
      title: string;
      reason: string;
      suggest: string;
      management: string;
      sourceTajyIds: string | null;
      reply: string | null;
      process: string | null;
      createAt: string;
      allEndorsers?: string;
    };
    const proposals = await query(`
      SELECT zstaId, zstabh, title, reason, suggest, management, sourceTajyIds, reply, process, createAt
      FROM zsta
      WHERE zstaId IN (${placeholders})
      ORDER BY zstaId
    `, idArray) as unknown as ZstaProposal[];

    // 动态计算 allEndorsers（所有子提案的附议人并集）
    for (const proposal of proposals) {
      let allEndorsers = '';
      if (proposal.sourceTajyIds) {
        try {
          const sourceIds = JSON.parse(proposal.sourceTajyIds) as number[];
          if (Array.isArray(sourceIds) && sourceIds.length > 0) {
            const tajyProposals = await query<{ fyr: string }>(`
              SELECT fyr FROM tajy WHERE tajyId IN (${sourceIds.map(() => '?').join(',')})
            `, sourceIds);

            const endorserSet = new Set<string>();
            for (const p of tajyProposals) {
              if (p.fyr) {
                const endorsers = p.fyr.split('，').filter((e: string) => e.trim());
                endorsers.forEach((e: string) => endorserSet.add(e));
              }
            }

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
      proposal.allEndorsers = allEndorsers;
    }

    return NextResponse.json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    console.error('Error fetching formal proposals by IDs:', error);
    return NextResponse.json({
      success: false,
      error: '获取正式提案失败',
    }, { status: 500 });
  }
}
