import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ProposalItem } from '@/app/api/proposals/route';

// GET /api/my-proposals - 获取当前用户的提案建议列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim();
    const userName = searchParams.get('userName')?.trim();
    const userType = searchParams.get('userType')?.trim();
    const name = searchParams.get('name')?.trim();
    const phone = searchParams.get('phone')?.trim();

    // 优先通过 userId 查询（已登录用户）
    if (userId) {
      let proposals: ProposalItem[];

      // 集体账户通过提案人名称匹配（集体提案的name字段存储的是部门名称）
      if (userType === 'department' && userName) {
        proposals = await query<ProposalItem>(`
          SELECT
            tajyId, tajybh, title, depart, name, stuid,
            brief, context, analysis, suggest, management,
            attachment, type, process, description, sfnm,
            fyr, mail, phone, clickCount, createAt
          FROM tajy
          WHERE type = 2 AND name = ? AND deletedAt IS NULL
          ORDER BY tajyId DESC
        `, [userName]);
      } else {
        // 个人账户通过 stuid 匹配
        proposals = await query<ProposalItem>(`
          SELECT
            tajyId, tajybh, title, depart, name, stuid,
            brief, context, analysis, suggest, management,
            attachment, type, process, description, sfnm,
            fyr, mail, phone, clickCount, createAt
          FROM tajy
          WHERE stuid = ? AND deletedAt IS NULL
          ORDER BY tajyId DESC
        `, [userId]);
      }

      return NextResponse.json({
        success: true,
        data: proposals,
      });
    }

    // 通过姓名或手机号查询（兼容旧逻辑）
    if (!name && !phone) {
      return NextResponse.json({
        success: false,
        error: '请提供姓名或手机号',
      }, { status: 400 });
    }

    let sql = `
      SELECT
        tajyId, tajybh, title, depart, name, stuid,
        brief, context, analysis, suggest, management,
        attachment, type, process, description, sfnm,
        fyr, mail, phone, clickCount, createAt
      FROM tajy
      WHERE deletedAt IS NULL
    `;
    const params: any[] = [];

    if (name) {
      sql += ' AND name = ?';
      params.push(name);
    }

    if (phone) {
      sql += ' AND phone = ?';
      params.push(phone);
    }

    sql += ' ORDER BY tajyId DESC';

    const proposals = await query<ProposalItem>(sql, params);

    return NextResponse.json({
      success: true,
      data: proposals,
    });
  } catch (error) {
    console.error('Error fetching my proposals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch proposals',
    }, { status: 500 });
  }
}
