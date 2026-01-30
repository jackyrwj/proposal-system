import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encryptPassword, generateRandomPassword } from '@/lib/password';

/**
 * POST /api/admin/settings/departments/reset-all-passwords
 * 重置所有部门密码为6位随机密码（数字+英文）
 */
export async function POST() {
  try {
    // 获取所有部门
    const departments = await query(
      `SELECT departId, departName, account FROM department`
    ) as { departId: string; departName: string; account: string }[];

    if (!departments || departments.length === 0) {
      return NextResponse.json({
        success: false,
        error: '暂无部门数据',
      });
    }

    const results: { account: string; password: string }[] = [];

    // 为每个部门生成新密码
    for (const dept of departments) {
      const password = generateRandomPassword(6);
      const encryptedPassword = encryptPassword(password);

      await query(`
        UPDATE department SET password = ?, needChangePassword = 1 WHERE departId = ?
      `, [encryptedPassword, dept.departId]);

      results.push({
        account: dept.account,
        password: password,
      });
    }

    return NextResponse.json({
      success: true,
      message: `已为 ${results.length} 个部门重置密码`,
      data: {
        departments: results,
      },
    });
  } catch (error) {
    console.error('Error resetting all passwords:', error);
    return NextResponse.json({
      success: false,
      error: '重置密码失败',
    }, { status: 500 });
  }
}
