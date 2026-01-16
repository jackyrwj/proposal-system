import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PUT /api/admin/zsta/[id] - Update a formal proposal
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
    const { title, reason, suggest, reply, management, process } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      values.push(reason);
    }
    if (suggest !== undefined) {
      updates.push('suggest = ?');
      values.push(suggest);
    }
    if (reply !== undefined) {
      updates.push('reply = ?');
      values.push(reply);
    }
    if (management !== undefined) {
      updates.push('management = ?');
      values.push(management);
    }
    if (process !== undefined) {
      updates.push('process = ?');
      values.push(process);
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update',
      }, { status: 400 });
    }

    values.push(proposalId);

    await query(`
      UPDATE zsta
      SET ${updates.join(', ')}
      WHERE zstaId = ?
    `, values);

    return NextResponse.json({
      success: true,
      message: 'Formal proposal updated successfully',
    });
  } catch (error) {
    console.error('Error updating formal proposal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update formal proposal',
    }, { status: 500 });
  }
}

// DELETE /api/admin/zsta/[id] - Delete a formal proposal
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
      DELETE FROM zsta
      WHERE zstaId = ?
    `, [proposalId]);

    return NextResponse.json({
      success: true,
      message: 'Formal proposal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting formal proposal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete formal proposal',
    }, { status: 500 });
  }
}
