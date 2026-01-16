import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
      SELECT tajyId, fyr, name, stuid
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

    // 不能附议自己的提案
    if (proposal.stuid === user.id) {
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

    // 获取当前用户的 stuid（学号），用于发送企业微信通知
    const users = await query<{ stuid: string }[]>(`
      SELECT stuid FROM jdhmd WHERE id = ?
    `, [user.id]);
    const userStuid = (users as any)?.[0]?.stuid;

    // 添加附议人
    const newEndorsements = [...existingEndorsements, currentEndorsement].join('，');

    await query(`
      UPDATE tajy SET fyr = ? WHERE tajyId = ?
    `, [newEndorsements, proposalId]);

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
      SELECT tajyId, fyr, name, stuid
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
