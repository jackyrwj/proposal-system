import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';
import { sendProposalProcessNotification } from '@/lib/wework';

// 从请求中获取用户信息
function getUserFromRequest(request: NextRequest): { id: string; name: string; type: string } | null {
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

// POST /api/admin/tajy/send-reply - 发送提案回复
export async function POST(request: NextRequest) {
  try {
    // 检查用户权限
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const body = await request.json();
    const { proposalId, replyDepartment, handleOpinion, detailReply, departmentName, replyContent } = body;

    if (!proposalId || !replyDepartment || !detailReply) {
      return NextResponse.json({
        success: false,
        error: '请填写完整的回复信息',
      }, { status: 400 });
    }

    // 查询提案信息
    const proposals = await query<{
      tajyId: number;
      title: string;
      name: string;
      stuid: string | null;
      depart: string;
      description: string | null;
    }>(`
      SELECT tajyId, title, name, stuid, depart, description
      FROM tajy WHERE tajyId = ?
    `, [proposalId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    const proposal = proposals[0];

    // 获取提案人的学号和cardId
    let proposerStuid = proposal.stuid;
    let cardId = proposal.stuid || proposal.depart;

    if (!proposerStuid) {
      // 如果提案没有stuid，尝试从jdhmd表查询
      const users = await query<{ stuid: string; id: string }>(`
        SELECT stuid, id FROM jdhmd WHERE name = ? AND depart = ? LIMIT 1
      `, [proposal.name, proposal.depart]);
      if (users && users.length > 0) {
        proposerStuid = users[0].stuid;
        cardId = users[0].id;
      }
    }

    // 构建提案链接
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    let proposalUrl = `${baseUrl}/proposals/${proposalId}`;  // 默认跳转到提案建议

    // 检查是否已转换为正式提案，从 description 中提取 zstaId
    if (proposal.description) {
      const match = proposal.description.match(/已转换为正式提案:(\d+)/);
      if (match && match[1]) {
        const zstaId = match[1];
        proposalUrl = `${baseUrl}/formal-proposals/${zstaId}`;  // 跳转到正式提案
      }
    }

    const replySummary = `${replyDepartment}已回复`;

    // 发送回复通知（企微 + 站内信）
    if (proposerStuid) {
      try {
        await sendProposalProcessNotification(
          proposerStuid,
          cardId,
          proposal.title,
          replySummary,
          proposalUrl,
          {
            replyDepartment,
            handleOpinion,
            detailReply,
            departmentName,
          }
        );
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        // 通知失败不影响整体流程
      }
    }

    return NextResponse.json({
      success: true,
      message: '回复已通过站内信和企业微信发送',
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json({
      success: false,
      error: '发送失败',
    }, { status: 500 });
  }
}
