import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/admin/settings/members - 获取教代会成员列表
export async function GET() {
  try {
    const members = await query<{
      id: string;
      name: string;
      unit: string;
      phone: string;
      cardNo: string;
      mail: string;
      isAdmin: number;
    }>(`
      SELECT id, name, depart as unit, phone, mail, isAdmin
      FROM jdhmd
      ORDER BY id ASC
    `);

    // 映射字段名
    const data = members.map(m => ({
      id: m.id,
      name: m.name,
      unit: m.unit || '',
      position: '',
      year: '',
      phone: m.phone || '',
      cardNo: m.id,
      mail: m.mail || '',
      isAdmin: m.isAdmin,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({
      success: false,
      error: '获取成员列表失败',
    }, { status: 500 });
  }
}

// POST /api/admin/settings/members - 添加新成员
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, unit, position, year, phone, cardNo, mail } = body;

    if (!name || !cardNo) {
      return NextResponse.json({
        success: false,
        error: '姓名和校园卡号不能为空',
      }, { status: 400 });
    }

    // 默认密码为 123456 的 MD5
    const defaultPassword = 'e10adc3949ba59abbe56e057f20f883e';

    await query(`
      INSERT INTO jdhmd (id, name, depart, phone, mail, password, isAdmin)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [cardNo, name, unit || '', phone || '', mail || '', defaultPassword]);

    return NextResponse.json({
      success: true,
      message: '添加成功',
    });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({
      success: false,
      error: '添加失败，可能校园卡号已存在',
    }, { status: 500 });
  }
}

// PUT /api/admin/settings/members/[id] - 更新成员
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, unit, position, year, phone, cardNo, mail } = body;

    // Extract ID from the URL
    const url = new URL(request.url);
    const id = url.pathname.split('/').slice(-2, -1)[0];

    if (!name || !cardNo) {
      return NextResponse.json({
        success: false,
        error: '姓名和校园卡号不能为空',
      }, { status: 400 });
    }

    await query(`
      UPDATE jdhmd
      SET id = ?, name = ?, depart = ?, phone = ?, mail = ?
      WHERE id = ?
    `, [cardNo, name, unit || '', phone || '', mail || '', id]);

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({
      success: false,
      error: '更新失败',
    }, { status: 500 });
  }
}

// DELETE /api/admin/settings/members/[id] - 删除成员
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').slice(-1)[0];

    await query(`DELETE FROM jdhmd WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({
      success: false,
      error: '删除失败',
    }, { status: 500 });
  }
}
