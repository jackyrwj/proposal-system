import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// DELETE /api/admin/tajy/batch - Batch delete proposals
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid IDs',
      }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    await query(`
      DELETE FROM tajy
      WHERE tajyId IN (${placeholders})
    `, ids);

    return NextResponse.json({
      success: true,
      message: `${ids.length} proposals deleted successfully`,
    });
  } catch (error) {
    console.error('Error batch deleting proposals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete proposals',
    }, { status: 500 });
  }
}
