import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encryptPassword, decryptPassword, generateRandomPassword } from '@/lib/password';

// GET /api/admin/settings/departments/[id]/reset-password - 获取当前密码（解密后的明文）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(`
      SELECT password FROM department WHERE departId = ?
    `, [id]) as { password: string }[];

    if (!result || result.length === 0) {
      return NextResponse.json({
        success: false,
        error: '部门不存在',
      }, { status: 404 });
    }

    const encryptedPassword = result[0].password;

    // 解密密码
    let originalPassword = '';
    try {
      originalPassword = decryptPassword(encryptedPassword);
    } catch (error) {
      console.error('Error decrypting password:', error);
      return NextResponse.json({
        success: false,
        error: '密码格式无效，无法解密',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { password: originalPassword },
    });
  } catch (error) {
    console.error('Error getting password:', error);
    return NextResponse.json({
      success: false,
      error: '获取密码失败',
    }, { status: 500 });
  }
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

    const encryptedPassword = encryptPassword(password);

    await query(`
      UPDATE department SET password = ?, needChangePassword = 1 WHERE departId = ?
    `, [encryptedPassword, id]);

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
