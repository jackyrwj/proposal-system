import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';

// GET /api/admin/settings/members - 获取教代会成员列表
export async function GET() {
  try {
    const members = await query<{
      id: string;
      stuid: string;
      name: string;
      unit: string;
      phone: string;
      cardNo: string;
      mail: string;
      isAdmin: number;
      createAt: string;
    }>(`
      SELECT id, stuid, name, depart as unit, phone, mail, isAdmin, createAt
      FROM jdhmd
      ORDER BY createAt ASC, id ASC
    `);

    // 映射字段名
    const data = members.map(m => ({
      id: m.id,
      stuid: m.stuid || '',
      name: m.name,
      unit: m.unit || '',
      position: '',
      year: '',
      phone: m.phone || '',
      cardNo: m.stuid || m.id,  // 校园卡号优先使用 stuid
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
    const { name, unit, position, year, phone, cardNo, mail, stuid } = body;

    if (!name || !cardNo) {
      return NextResponse.json({
        success: false,
        error: '姓名和校园卡号不能为空',
      }, { status: 400 });
    }

    // 默认密码为 123456 的 MD5
    const defaultPassword = 'e10adc3949ba59abbe56e057f20f883e';
    const now = getChinaTimeString();

    // id 使用职工号，stuid 使用校园卡号
    const employeeId = body.employeeId || cardNo;  // 如果没有职工号，使用校园卡号

    await query(`
      INSERT INTO jdhmd (id, stuid, name, depart, phone, mail, password, isAdmin, createAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [employeeId, stuid || cardNo, name, unit || '', phone || '', mail || '', defaultPassword, now]);

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
