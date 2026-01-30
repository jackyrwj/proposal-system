import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encryptPassword, decryptPassword, generateRandomPassword } from '@/lib/password';

// GET /api/admin/settings/departments - 获取部门列表
export async function GET() {
  try {
    const departments = await query<{
      departId: number;
      departName: string;
      account: string;
    }>(`
      SELECT departId, departName as name, account
      FROM department
      ORDER BY departId ASC
    `);

    return NextResponse.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({
      success: false,
      error: '获取部门列表失败',
    }, { status: 500 });
  }
}

// GET /api/admin/settings/departments/[id]/password - 获取部门当前密码（解密后的明文）
export async function GET_password(
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
      // 如果解密失败（可能是旧数据或格式不对），返回错误
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

// POST /api/admin/settings/departments - 添加新部门
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, account, password } = body;

    if (!name || !account) {
      return NextResponse.json({
        success: false,
        error: '部门名称和账号不能为空',
      }, { status: 400 });
    }

    // 生成部门ID (取当前最大ID加1)
    const maxIdResult = await query<{ maxId: number }>(`SELECT MAX(CAST(departId AS UNSIGNED)) as maxId FROM department`);
    const newId = (parseInt(maxIdResult[0]?.maxId?.toString() || '0') + 1);

    // 如果没有提供密码，生成随机密码
    const finalPassword = password || generateRandomPassword();
    const encryptedPassword = encryptPassword(finalPassword);

    await query(`
      INSERT INTO department (departId, departName, account, password, needChangePassword)
      VALUES (?, ?, ?, ?, 1)
    `, [newId, name, account, encryptedPassword]);

    return NextResponse.json({
      success: true,
      data: { departId: newId, password: finalPassword },
      message: '添加成功',
    });
  } catch (error) {
    console.error('Error adding department:', error);
    return NextResponse.json({
      success: false,
      error: '添加失败，可能账号已存在',
    }, { status: 500 });
  }
}

// PUT /api/admin/settings/departments/[id] - 更新部门
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, account } = body;

    const url = new URL(request.url);
    const departId = url.pathname.split('/').slice(-2, -1)[0];

    if (!name || !account) {
      return NextResponse.json({
        success: false,
        error: '部门名称和账号不能为空',
      }, { status: 400 });
    }

    await query(`
      UPDATE department SET departName = ?, account = ? WHERE departId = ?
    `, [name, account, departId]);

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({
      success: false,
      error: '更新失败',
    }, { status: 500 });
  }
}

// DELETE /api/admin/settings/departments/[id] - 删除部门
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const departId = url.pathname.split('/').slice(-1)[0];

    await query(`DELETE FROM department WHERE departId = ?`, [departId]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({
      success: false,
      error: '删除失败',
    }, { status: 500 });
  }
}
