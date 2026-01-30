import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEndorsementReceivedNotification } from '@/lib/wework';

// 从请求头获取用户信息
function getUserFromRequest(request: NextRequest) {
  const userHeader = request.headers.get('x-user-info');
  if (!userHeader) return null;
  try {
    return JSON.parse(decodeURIComponent(userHeader));
  } catch {
    return null;
  }
}

// 获取附议功能开关状态
async function getEnableSignSetting(): Promise<number> {
  try {
    const result = await query<{ enableSign: number }[]>(`
      SELECT enableSign FROM system_params LIMIT 1
    `);
    return (result as any)?.[0]?.enableSign ?? 1;
  } catch {
    return 1; // 默认开启
  }
}

// POST /api/proposals/[id]/endorse - 附议提案
export async function POST(
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

    // 检查附议功能是否开启
    const enableSign = await getEnableSignSetting();
    if (enableSign !== 1) {
      return NextResponse.json({
        success: false,
        error: '附议功能已关闭',
      }, { status: 403 });
    }

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 只有个人账户可以附议
    if (user.type !== 'individual') {
      return NextResponse.json({
        success: false,
        error: '只有个人账户才能附议',
      }, { status: 403 });
    }

    // 获取提案信息
    const proposals = await query<any[]>(`
      SELECT tajyId, fyr, name, stuid, title
      FROM tajy
      WHERE tajyId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    const proposal = proposals[0] as any;

    // 不能附议自己的提案（通过 stuid 比较）
    // 获取当前用户的 stuid
    let userStuid: string | null = user.stuid || null;
    if (!userStuid) {
      const users = await query(`
        SELECT stuid FROM jdhmd WHERE id = ?
      `, [user.id]) as { stuid: string }[];
      userStuid = users[0]?.stuid || null;
    }
    if (proposal.stuid && userStuid && String(proposal.stuid) === String(userStuid)) {
      return NextResponse.json({
        success: false,
        error: '不能附议自己的提案',
      }, { status: 400 });
    }

    // 检查是否已经附议
    const currentEndorsement = `${user.name}(${user.id})`;
    const existingEndorsements = proposal.fyr ? proposal.fyr.split('，').filter((f: string) => f.trim()) : [];

    for (const endorsement of existingEndorsements) {
      if (endorsement.includes(`(${user.id})`) || endorsement === currentEndorsement) {
        return NextResponse.json({
          success: false,
          error: '您已经附议过该提案',
        }, { status: 400 });
      }
    }

    // 添加附议人
    const newEndorsements = [...existingEndorsements, currentEndorsement].join('，');

    await query(`
      UPDATE tajy SET fyr = ? WHERE tajyId = ?
    `, [newEndorsements, proposalId]);

    // 发送站内信通知提案人（仅站内信，不发企微）
    const ownerData = await query(`
      SELECT id FROM jdhmd WHERE stuid = ?
    `, [proposal.stuid]) as { id: string }[];

    if (ownerData && ownerData[0]) {
      const ownerCardId = ownerData[0].id;
      const proposalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/proposals/${proposalId}`;

      sendEndorsementReceivedNotification(
        ownerCardId,
        proposal.title || '未知提案',
        user.name || '某位老师',
        proposalId,
        proposalUrl
      ).catch(err => {
        console.error('Failed to send endorsement received notification:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: '附议成功',
      data: {
        fyr: newEndorsements,
      },
    });
  } catch (error) {
    console.error('Error endorsing proposal:', error);
    return NextResponse.json({
      success: false,
      error: '附议失败',
    }, { status: 500 });
  }
}

// DELETE /api/proposals/[id]/endorse - 取消附议
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

    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    // 只有个人账户可以取消附议
    if (user.type !== 'individual') {
      return NextResponse.json({
        success: false,
        error: '只有个人账户才能取消附议',
      }, { status: 403 });
    }

    // 获取提案信息
    const proposals = await query<any[]>(`
      SELECT tajyId, fyr, name, stuid, title
      FROM tajy
      WHERE tajyId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    const proposal = proposals[0] as any;

    if (!proposal.fyr) {
      return NextResponse.json({
        success: false,
        error: '您还没有附议过该提案',
      }, { status: 400 });
    }

    // 移除该用户的附议
    const existingEndorsements = proposal.fyr.split('，').filter((f: string) => f.trim());
    const newEndorsements = existingEndorsements.filter((e: string) => !e.includes(`(${user.id})`));

    if (newEndorsements.length === existingEndorsements.length) {
      return NextResponse.json({
        success: false,
        error: '您还没有附议过该提案',
      }, { status: 400 });
    }

    const updatedFyr = newEndorsements.length > 0 ? newEndorsements.join('，') : '';

    await query(`
      UPDATE tajy SET fyr = ? WHERE tajyId = ?
    `, [updatedFyr, proposalId]);

    return NextResponse.json({
      success: true,
      message: '已取消附议',
      data: {
        fyr: updatedFyr,
      },
    });
  } catch (error) {
    console.error('Error canceling endorsement:', error);
    return NextResponse.json({
      success: false,
      error: '取消附议失败',
    }, { status: 500 });
  }
}
