import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';
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
        SELECT title, name, stuid, depart FROM tajy WHERE tajyId = ? AND deletedAt IS NULL
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

    // 软删除提案（设置 deletedAt）
    const timeStr = getChinaTimeString();
    await query(`
      UPDATE tajy SET deletedAt = ? WHERE tajyId = ?
    `, [timeStr, proposalId]);

    return NextResponse.json({
      success: true,
      message: '提案删除成功',
    });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete proposal',
    }, { status: 500 });
  }
}
