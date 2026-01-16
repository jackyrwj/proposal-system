import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendProposalProcessNotification, getProcessStatusText } from '@/lib/wework';

// PUT /api/admin/tajy/[id] - Update a proposal
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
        error: 'Invalid ID',
      }, { status: 400 });
    }

    const body = await request.json();
    const { title, brief, analysis, suggest, description, process, type } = body;

    // 如果要更新 process，先获取原提案信息用于发送通知
    let proposalInfo: { title: string; name: string; stuid: string | null; depart: string } | null = null;
    if (process !== undefined) {
      const proposals = await query<{
        title: string;
        name: string;
        stuid: string | null;
        depart: string;
      }>(`
        SELECT title, name, stuid, depart FROM tajy WHERE tajyId = ?
      `, [proposalId]);
      if (proposals && proposals.length > 0) {
        proposalInfo = proposals[0];
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (brief !== undefined) {
      updates.push('brief = ?');
      values.push(brief);
    }
    if (analysis !== undefined) {
      updates.push('analysis = ?');
      values.push(analysis);
    }
    if (suggest !== undefined) {
      updates.push('suggest = ?');
      values.push(suggest);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (process !== undefined) {
      updates.push('process = ?');
      values.push(process);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update',
      }, { status: 400 });
    }

    values.push(proposalId);

    await query(`
      UPDATE tajy
      SET ${updates.join(', ')}
      WHERE tajyId = ?
    `, values);

    // 发送审批进度通知（企微 + 站内信）
    if (process !== undefined && proposalInfo) {
      try {
        // 获取提案人学号和cardId
        let proposerStuid = proposalInfo.stuid;
        let cardId = proposalInfo.stuid || proposalInfo.depart; // 优先用stuid作为cardId

        if (!proposerStuid) {
          // 如果没有 stuid，尝试从 jdhmd 表查询
          const users = await query<{ stuid: string; id: string }>(`
            SELECT stuid, id FROM jdhmd WHERE name = ? AND depart = ? LIMIT 1
          `, [proposalInfo.name, proposalInfo.depart]);
          if (users && users.length > 0) {
            proposerStuid = users[0].stuid;
            cardId = users[0].id;
          }
        }

        if (proposerStuid) {
          // 构建提案详情链接
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const proposalUrl = `${baseUrl}/proposals/${proposalId}`;
          const proposalTitle = title || proposalInfo.title;
          const statusText = getProcessStatusText(process);

          await sendProposalProcessNotification(
            proposerStuid,
            cardId,
            proposalTitle,
            statusText,
            proposalUrl
          );
        }
      } catch (notificationError) {
        console.error('Notification error:', notificationError);
        // 通知失败不影响更新操作
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Proposal updated successfully',
    });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update proposal',
    }, { status: 500 });
  }
}

// DELETE /api/admin/tajy/[id] - Delete a proposal
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
        error: 'Invalid ID',
      }, { status: 400 });
    }

    await query(`
      DELETE FROM tajy
      WHERE tajyId = ?
    `, [proposalId]);

    return NextResponse.json({
      success: true,
      message: 'Proposal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete proposal',
    }, { status: 500 });
  }
}
