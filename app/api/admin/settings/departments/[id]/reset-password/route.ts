import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

// Helper function to hash password with MD5
function hashPassword(password: string): string {
  return crypto.createHash('md5').update(password).digest('hex');
}

// POST /api/admin/settings/departments/[id]/reset-password - 重置部门密码
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({
        success: false,
        error: '密码不能为空',
      }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    await query(`
      UPDATE department SET password = ?, needChangePassword = 1 WHERE departId = ?
    `, [passwordHash, id]);

    return NextResponse.json({
      success: true,
      message: '密码已重置',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({
      success: false,
      error: '重置失败',
    }, { status: 500 });
  }
}
