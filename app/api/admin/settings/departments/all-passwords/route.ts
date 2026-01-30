import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decryptPassword } from '@/lib/password';

/**
 * GET /api/admin/settings/departments/all-passwords
 * 获取所有部门的密码（解密后的明文）
 */
export async function GET() {
  try {
    const departments = await query(
      `SELECT departId, departName, account, password FROM department`
    ) as { departId: string; departName: string; account: string; password: string }[];

    if (!departments || departments.length === 0) {
      return NextResponse.json({
        success: false,
        error: '暂无部门数据',
      });
    }

    const results: { departId: string; name: string; account: string; password: string }[] = [];

    for (const dept of departments) {
      try {
        const decryptedPassword = decryptPassword(dept.password);
        results.push({
          departId: dept.departId,
          name: dept.departName,
          account: dept.account,
          password: decryptedPassword,
        });
      } catch (error) {
        console.error(`Error decrypting password for department ${dept.departId}:`, error);
        // 如果解密失败，跳过该部门或标记为无法获取
        results.push({
          departId: dept.departId,
          name: dept.departName,
          account: dept.account,
          password: '（无法解密）',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error getting all passwords:', error);
    return NextResponse.json({
      success: false,
      error: '获取密码失败',
    }, { status: 500 });
  }
}
