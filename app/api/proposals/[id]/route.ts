import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 从请求中获取用户信息
function getUserFromRequest(request: NextRequest): { id: string; name: string; type: string; stuid?: string } | null {
  try {
    // 从 cookie 获取用户信息
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(c => c.trim());
    const userCookie = cookies.find(c => c.startsWith('user='));
    if (!userCookie) return null;

    const userStr = decodeURIComponent(userCookie.split('=')[1]);
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export interface ProposalDetailItem {
  tajyId: number;
  tajybh: number;
  title: string;
  depart: string;
  name: string;
  stuid: string;
  brief: string;
  context: string;
  analysis: string;
  suggest: string;
  management: string;
  attachment: string;
  type: number;
  process: number;
  description: string;
  sfnm: number;
  fyr: string;
  mail: string;
  phone: string;
  clickCount: number;
  createAt: string;
}

// GET /api/proposals/[id] - 获取单个提案建议详情
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

    const proposals = await query<ProposalDetailItem>(`
      SELECT
        tajyId, tajybh, title, depart, name, stuid,
        brief, context, analysis, suggest, management,
        attachment, type, process, description, sfnm,
        fyr, mail, phone, clickCount, createAt
      FROM tajy
      WHERE tajyId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Proposal not found',
      }, { status: 404 });
    }

    // 获取当前用户
    const currentUser = getUserFromRequest(request);

    // 获取待确认/已拒绝的附议邀请（仅当前用户）
    let pendingEndorsement = null;
    if (currentUser && currentUser.type === 'individual') {
      const endorsements = await query<{
        id: number;
        status: 'pending' | 'accepted' | 'rejected';
      }[]>(`
        SELECT id, status FROM proposal_endorsements
        WHERE proposalId = ? AND endorserId = ?
      `, [proposalId, currentUser.id]);

      if (endorsements && endorsements.length > 0) {
        pendingEndorsement = endorsements[0];
      }
    }

    // 增加点击次数
    await query(`
      UPDATE tajy SET clickCount = clickCount + 1 WHERE tajyId = ?
    `, [proposalId]);

    return NextResponse.json({
      success: true,
      data: {
        ...proposals[0],
        pendingEndorsement, // 当前用户的附议邀请状态
      },
    });
  } catch (error) {
    console.error('Error fetching proposal detail:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch proposal detail',
    }, { status: 500 });
  }
}

// DELETE /api/proposals/[id] - 删除提案建议
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

    // 获取当前用户信息
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 查询提案信息
    const proposals = await query<{ tajyId: number; stuid: string | null; name: string; type: number; process: number }>(`
      SELECT tajyId, stuid, name, type, process FROM tajy WHERE tajyId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    const proposal = proposals[0];

    // 检查是否可以删除：只有未审核（process=0）的提案可以删除
    if (proposal.process !== 0) {
      return NextResponse.json({
        success: false,
        error: '只能删除未审核的提案',
      }, { status: 400 });
    }

    // 检查权限：只有提案创建者可以删除
    if (user.type === 'individual') {
      // 个人账号：通过 stuid 匹配
      // 兼容新旧两种情况：新提案用 user.stuid，旧提案用的是 parseInt(user.id)
      const proposalStuidStr = String(proposal.stuid).trim();
      const userIdNum = parseInt(user.id, 10);
      const hasPermission = proposalStuidStr === (user.stuid || '') ||
                             proposalStuidStr === user.id ||
                             (userIdNum > 0 && proposalStuidStr === String(userIdNum));

      if (!hasPermission) {
        return NextResponse.json({
          success: false,
          error: '无权删除此提案',
        }, { status: 403 });
      }
    } else if (user.type === 'department') {
      // 集体账号：通过 name 匹配
      if (proposal.name !== user.name) {
        return NextResponse.json({
          success: false,
          error: '无权删除此提案',
        }, { status: 403 });
      }
    }

    // 删除提案
    await query(`
      DELETE FROM tajy WHERE tajyId = ?
    `, [proposalId]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({
      success: false,
      error: '删除失败',
    }, { status: 500 });
  }
}

// PUT /api/proposals/[id] - 更新提案建议（仅限未审核状态）
export async function PUT(
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

    // 获取当前用户信息
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 查询提案信息
    const proposals = await query<{ tajyId: number; stuid: string | null; name: string; type: number; process: number }>(`
      SELECT tajyId, stuid, name, type, process FROM tajy WHERE tajyId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    const proposal = proposals[0];

    // 检查是否可以编辑：只有未审核（process=0）的提案可以编辑
    if (proposal.process !== 0) {
      return NextResponse.json({
        success: false,
        error: '只能编辑未审核的提案',
      }, { status: 400 });
    }

    // 检查权限：只有提案创建者可以编辑
    if (user.type === 'individual') {
      // 个人账号：通过 stuid 匹配
      // 兼容新旧两种情况：新提案用 user.stuid，旧提案用的是 parseInt(user.id)
      const proposalStuidStr = String(proposal.stuid).trim();
      const userIdNum = parseInt(user.id, 10);
      const hasPermission = proposalStuidStr === (user.stuid || '') ||
                             proposalStuidStr === user.id ||
                             (userIdNum > 0 && proposalStuidStr === String(userIdNum));

      if (!hasPermission) {
        return NextResponse.json({
          success: false,
          error: '无权编辑此提案',
        }, { status: 403 });
      }
    } else if (user.type === 'department') {
      // 集体账号：通过 name 匹配
      if (proposal.name !== user.name) {
        return NextResponse.json({
          success: false,
          error: '无权编辑此提案',
        }, { status: 403 });
      }
    }

    // 获取更新数据
    const body = await request.json();
    const { title, brief, analysis, suggest, depart, name, phone, mail, fyr, fyrdepart, fl, type } = body;

    // 更新提案
    await query(`
      UPDATE tajy
      SET title = ?, brief = ?, analysis = ?, suggest = ?, depart = ?, name = ?,
          phone = ?, mail = ?, fyr = ?, fyrdepart = ?, fl = ?, type = ?
      WHERE tajyId = ?
    `, [title, brief, analysis, suggest, depart, name, phone, mail, fyr, fyrdepart, fl, type, proposalId]);

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json({
      success: false,
      error: '更新失败',
    }, { status: 500 });
  }
}
