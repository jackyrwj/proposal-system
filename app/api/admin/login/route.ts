import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '用户名和密码不能为空',
      }, { status: 400 });
    }

    // 计算密码的 MD5
    const passwordHash = crypto.createHash('md5').update(password).digest('hex');

    // 从数据库查询管理员账户
    const adminUsers = await query<any[]>(`
      SELECT id, name, depart, isAdmin
      FROM jdhmd
      WHERE id = ? AND password = ? AND isAdmin = 1
    `, [username, passwordHash]);

    if (adminUsers.length > 0) {
      // 管理员登录成功
      const adminUser: { id: string; name: string; depart: string } = adminUsers[0] as any;
      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
      const userData = JSON.stringify({
        id: adminUser.id,
        name: adminUser.name,
        depart: adminUser.depart,
        role: 'admin',
      });

      // 创建响应
      const response = NextResponse.json({
        success: true,
        token,
        user: JSON.parse(userData),
      });

      // 设置 Cookie
      response.cookies.set('adminToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24小时
      });
      response.cookies.set('adminUser', userData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24小时
      });

      return response;
    }

    return NextResponse.json({
      success: false,
      error: '用户名或密码错误',
    }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: '登录失败',
    }, { status: 500 });
  }
}
