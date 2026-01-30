import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';

// 从请求中获取用户信息
function getUserFromRequest(request: NextRequest): { id: string; name: string; type: string; stuid?: string } | null {
  try {
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

// POST /api/proposals/[id]/confirm - 提案人确认已读处理结果
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

    // 获取当前用户信息
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    if (user.type !== 'individual') {
      return NextResponse.json({
        success: false,
        error: '只有个人账号可以确认',
      }, { status: 403 });
    }

    // 查询提案信息
    const proposals = await query<{ tajyId: number; stuid: string | null; name: string; ownerConfirmed: number }>(`
      SELECT tajyId, stuid, name, ownerConfirmed FROM tajy WHERE tajyId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    const proposal = proposals[0];

    // 检查是否已经是提案人
    let isOwner = false;
    const proposalStuidStr = String(proposal.stuid || '').trim();

    // 方案1：通过 stuid 匹配
    if (user.stuid && String(user.stuid).trim() !== '' && proposalStuidStr !== '') {
      isOwner = String(user.stuid).trim() === proposalStuidStr;
    }
    // 方案2：通过 name 匹配（stuid 为空时使用）
    if (!isOwner && user.name && proposal.name && String(user.name).trim() !== '' && String(proposal.name).trim() !== '') {
      isOwner = String(user.name).trim() === String(proposal.name).trim();
    }

    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: '只有提案人可以确认',
      }, { status: 403 });
    }

    // 检查是否已经确认过
    if (proposal.ownerConfirmed === 1) {
      return NextResponse.json({
        success: false,
        error: '您已经确认过了',
      }, { status: 400 });
    }

    // 更新确认状态 - 直接使用北京时间，不依赖时区函数
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours() + 8).padStart(2, '0');
    const minute = String(now.getUTCMinutes()).padStart(2, '0');
    const second = String(now.getUTCSeconds()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

    await query(`
      UPDATE tajy SET ownerConfirmed = 1, ownerConfirmedAt = ? WHERE tajyId = ?
    `, [timeStr, proposalId]);

    return NextResponse.json({
      success: true,
      message: '确认成功',
    });
  } catch (error) {
    console.error('Error confirming proposal:', error);
    return NextResponse.json({
      success: false,
      error: '确认失败',
    }, { status: 500 });
  }
}
