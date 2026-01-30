import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';
import { sendEndorseInvitationNotification } from '@/lib/wework';

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
  ownerConfirmed: number;
  ownerConfirmedAt: string | null;
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
        fyr, mail, phone, clickCount, createAt,
        ownerConfirmed, ownerConfirmedAt
      FROM tajy
      WHERE tajyId = ? AND deletedAt IS NULL
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Proposal not found',
      }, { status: 404 });
    }

    // 获取当前用户
    const currentUser = getUserFromRequest(request);

    // 获取当前用户的 stuid（学号/工号）
    let currentUserStuid = null;
    let currentUserName = null;
    if (currentUser && currentUser.type === 'individual') {
      currentUserName = currentUser.name;
      if (currentUser.stuid) {
        // 如果用户信息中已有 stuid，直接使用
        currentUserStuid = currentUser.stuid;
      }
      // 也尝试从数据库查询
      const users = await query(`
        SELECT stuid, name FROM jdhmd WHERE id = ?
      `, [currentUser.id]) as { stuid: string; name: string }[];
      if (users && users.length > 0) {
        if (!currentUserStuid && users[0].stuid) {
          currentUserStuid = users[0].stuid;
        }
        if (!currentUserName && users[0].name) {
          currentUserName = users[0].name;
        }
      }
      // 记录用户的 id（数字形式），用于兼容旧数据
      const currentUserIdNum = parseInt(currentUser.id, 10);
    }

    // 计算当前用户是否是提案人
    const proposalStuid = proposals[0].stuid;
    const proposalName = proposals[0].name;

    let isOwner = false;
    if (currentUser && currentUser.type === 'individual') {
      // 方案1：通过 stuid 匹配
      if (currentUserStuid && String(currentUserStuid).trim() !== '' && String(proposalStuid).trim() !== '') {
        isOwner = String(currentUserStuid).trim() === String(proposalStuid).trim();
      }
      // 方案2：通过 name 匹配（stuid 为空时使用）
      if (!isOwner && currentUserName && proposalName && String(currentUserName).trim() !== '' && String(proposalName).trim() !== '') {
        isOwner = String(currentUserName).trim() === String(proposalName).trim();
      }
    }

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

    // 获取所有附议人的确认状态（用于编辑页面判断是否可以修改）
    const fyrStatuses: Record<string, string> = {};
    if (proposals[0].fyr) {
      // 解析 fyr 字段获取附议人 ID 列表
      const fyrMatches = proposals[0].fyr.match(/\(([^)]+)\)/g) || [];
      const endorserIds = fyrMatches.map(m => m.replace(/[()]/g, '')).filter(id => id);

      if (endorserIds.length > 0) {
        // 查询所有相关附议人的状态
        const statuses = await query<{ endorserId: string; status: string }[]>(`
          SELECT endorserId, status FROM proposal_endorsements
          WHERE proposalId = ? AND endorserId IN (${endorserIds.map(() => '?').join(',')})
        `, [proposalId, ...endorserIds]);

        // 构建状态映射
        for (const s of statuses as any[]) {
          fyrStatuses[s.endorserId] = s.status;
        }

        // 对于 fyr 中有但 proposal_endorsements 中没有的，视为 pending（受邀但未确认）
        for (const id of endorserIds) {
          if (!fyrStatuses[id]) {
            fyrStatuses[id] = 'pending';
          }
        }
      }
    }

    // 增加点击次数
    await query(`
      UPDATE tajy SET clickCount = clickCount + 1 WHERE tajyId = ?
    `, [proposalId]);

    // 对 ownerConfirmedAt 进行时区补偿（数据库连接有时区设置，需要+8小时）
    const proposalData = { ...proposals[0] };
    if (proposalData.ownerConfirmedAt) {
      const date = new Date(proposalData.ownerConfirmedAt);
      date.setHours(date.getHours() + 8);
      proposalData.ownerConfirmedAt = date.toISOString().slice(0, 19).replace('T', ' ');
    }

    return NextResponse.json({
      success: true,
      data: {
        ...proposalData,
        pendingEndorsement, // 当前用户的附议邀请状态
        fyrStatuses, // 所有附议人的确认状态
        isOwner, // 当前用户是否是提案人
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

    // 查询提案信息（软删除过滤）
    const proposals = await query<{ tajyId: number; stuid: string | null; name: string; type: number; process: number }>(`
      SELECT tajyId, stuid, name, type, process FROM tajy WHERE tajyId = ? AND deletedAt IS NULL
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在或已被删除',
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

    // 软删除提案（设置 deletedAt）
    const timeStr = getChinaTimeString();
    await query(`
      UPDATE tajy SET deletedAt = ? WHERE tajyId = ?
    `, [timeStr, proposalId]);

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
    const proposals = await query<{ tajyId: number; stuid: string | null; name: string; type: number; process: number; fyr: string | null }>(`
      SELECT tajyId, stuid, name, type, process, fyr FROM tajy WHERE tajyId = ?
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
      const proposalStuidStr = String(proposal.stuid || '').trim();
      const userIdNum = parseInt(user.id, 10);

      // 方式1：通过 name 匹配（最可靠）
      const nameMatch = proposal.name && user.name &&
        String(proposal.name).trim() === String(user.name).trim();

      // 方式2：通过 stuid 匹配（如果 user 有 stuid）
      const stuidMatch = user.stuid && proposalStuidStr === String(user.stuid).trim();

      // 方式3：通过 id 匹配（兼容旧数据：proposal.stuid 存的是 parseInt(user.id) 的结果）
      const idMatch = proposalStuidStr === user.id ||
                     (userIdNum > 0 && proposalStuidStr === String(userIdNum));

      const hasPermission = nameMatch || stuidMatch || idMatch;

      if (!hasPermission) {
        console.log('[API] Permission denied:', {
          proposalName: proposal.name,
          userName: user.name,
          nameMatch,
          stuidMatch,
          idMatch,
        });
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
    const { title, brief, analysis, suggest, depart, name, phone, mail, fyr, type } = body;

    // 保存旧的 fyr 用于比较
    const oldFyr = proposal.fyr || '';
    const oldEndorserIds = oldFyr.match(/\(([^)]+)\)/g)?.map(m => m.replace(/[()]/g, '')) || [];

    // 更新提案
    await query(`
      UPDATE tajy
      SET title = ?, brief = ?, analysis = ?, suggest = ?, depart = ?, name = ?,
          phone = ?, mail = ?, fyr = ?, type = ?
      WHERE tajyId = ?
    `, [title, brief, analysis, suggest, depart, name, phone, mail, fyr, type, proposalId]);

    // 检测新增的附议人并发送通知
    if (fyr && fyr !== oldFyr) {
      const newEndorserIds = fyr.match(/\(([^)]+)\)/g)?.map((m: string) => m.replace(/[()]/g, '')) || [];
      const addedEndorserIds = newEndorserIds.filter((id: string) => !oldEndorserIds.includes(id));

      if (addedEndorserIds.length > 0) {
        console.log('[Edit Proposal] 新增的附议人 IDs:', addedEndorserIds);

        // 查询新增附议人的 stuid
        const endorsers = await query<{ stuid: string | null; id: string }[]>(`
          SELECT stuid, id FROM jdhmd WHERE id IN (${addedEndorserIds.map(() => '?').join(',')})
        `, addedEndorserIds);

        const stuids = endorsers.map((e: any) => e.stuid).filter((s: string | undefined) => s);
        const cardIds = endorsers.map((e: any) => e.id);

        if (stuids.length > 0) {
          // 发送附议邀请通知
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
          const endorseUrl = `${baseUrl}/proposals/${proposalId}`;

          sendEndorseInvitationNotification(stuids, cardIds, name, title, proposalId, endorseUrl).catch(err => {
            console.error('[Edit Proposal] 发送附议邀请通知失败:', err);
          });

          // 在 proposal_endorsements 表中创建待确认记录
          try {
            const values = addedEndorserIds.map(() => '(?, ?, ?)').join(', ');
            const params = addedEndorserIds.flatMap((id: string) => [
              proposalId,
              id,
              'pending',
            ]);

            await query(`
              INSERT INTO proposal_endorsements (proposalId, endorserId, status)
              VALUES ${values}
            `, params);
            console.log('[Edit Proposal] 新增附议邀请记录创建成功');
          } catch (err) {
            console.error('[Edit Proposal] 新增附议邀请记录创建失败:', err);
          }
        }
      }
    }

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
