import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getChinaTimeString } from '@/lib/db';
import { sendEndorsementReceivedNotification } from '@/lib/wework';

// GET /api/proposals/[id]/endorsements - 获取附议邀请状态
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

    // 从请求头获取用户信息
    const userHeader = request.headers.get('x-user-info');
    if (!userHeader) {
      return NextResponse.json({
        success: false,
        error: '未登录',
      }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userHeader));
    const endorserId = user.id;

    // 获取当前用户对此提案的附议邀请状态
    const endorsements = await query<{
      id: number;
      proposalId: number;
      endorserId: string;
      status: 'pending' | 'accepted' | 'rejected';
      createdAt: string;
      respondedAt: string;
    }[]>(`
      SELECT id, proposalId, endorserId, status, createdAt, respondedAt
      FROM proposal_endorsements
      WHERE proposalId = ? AND endorserId = ?
    `, [proposalId, endorserId]);

    return NextResponse.json({
      success: true,
      data: endorsements?.[0] || null,
    });
  } catch (error) {
    console.error('Error fetching endorsement status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch endorsement status',
    }, { status: 500 });
  }
}

// POST /api/proposals/[id]/endorsements - 确认/拒绝附议邀请
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

    const body = await request.json();
    const { action } = body; // 'accept' 或 'reject'

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({
        success: false,
        error: '无效的操作',
      }, { status: 400 });
    }

    // 从请求头获取用户信息
    const userHeader = request.headers.get('x-user-info');
    if (!userHeader) {
      return NextResponse.json({
        success: false,
        error: '未登录',
      }, { status: 401 });
    }

    const user = JSON.parse(decodeURIComponent(userHeader));
    const endorserId = user.id;

    // 检查是否有待确认的邀请
    const endorsements = await query<{
      id: number;
      status: string;
    }[]>(`
      SELECT id, status FROM proposal_endorsements
      WHERE proposalId = ? AND endorserId = ?
    `, [proposalId, endorserId]);

    const endorsement = endorsements?.[0] as any;

    if (!endorsement) {
      return NextResponse.json({
        success: false,
        error: '未找到附议邀请',
      }, { status: 404 });
    }

    if (endorsement.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: '该邀请已处理',
      }, { status: 400 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const timeStr = getChinaTimeString();

    // 更新状态
    await query(`
      UPDATE proposal_endorsements
      SET status = ?, respondedAt = ?
      WHERE id = ?
    `, [newStatus, timeStr, endorsement.id]);

    // 如果接受附议，添加到 fyr 字段
    if (action === 'accept') {
      // 获取提案和附议人信息
      const proposalData = await query<any[]>(`
        SELECT tajyId, fyr, name, stuid, title FROM tajy WHERE tajyId = ?
      `, [proposalId]);

      if (proposalData && proposalData[0]) {
        const proposal = proposalData[0] as any;
        const newEndorsement = `${user.name}(${endorserId})`;
        const currentFyr = proposal.fyr || '';
        const updatedFyr = currentFyr
          ? `${currentFyr}，${newEndorsement}`
          : newEndorsement;

        await query(`
          UPDATE tajy SET fyr = ? WHERE tajyId = ?
        `, [updatedFyr, proposalId]);

        // 获取提案人的 cardId 用于发送站内信
        const ownerData = await query(`
          SELECT id FROM jdhmd WHERE stuid = ?
        `, [proposal.stuid]) as { id: string }[];

        // 发送站内信通知提案人（仅站内信，不发企微）
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
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? '已接受附议' : '已拒绝附议',
      data: { status: newStatus },
    });
  } catch (error) {
    console.error('Error processing endorsement:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process endorsement',
    }, { status: 500 });
  }
}
