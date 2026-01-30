import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decryptPassword } from '@/lib/password';

// 登录类型：individual(个人) 或 department(集体)
export async function POST(request: NextRequest) {
  try {
    const { username, password, loginType } = await request.json();

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '用户名和密码不能为空',
      }, { status: 400 });
    }

    if (loginType === 'department') {
      // 集体账号登录 - 查询 department 表
      const departments = await query<any[]>(`
        SELECT departId, departName, account, password
        FROM department
        WHERE account = ?
      `, [username]);

      if (departments.length > 0) {
        const dept = departments[0] as any;
        const encryptedPassword = dept.password;

        try {
          // 解密存储的密码
          const storedPassword = decryptPassword(encryptedPassword);
          // 比对明文密码
          if (storedPassword === password) {
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            return NextResponse.json({
              success: true,
              token,
              user: {
                id: dept.departId,
                name: dept.departName,
                type: 'department',
              },
            });
          }
        } catch (error) {
          console.error('Error decrypting password:', error);
        }
      }
    } else {
      // 个人账号登录 - 查询 jdhmd 表（仍使用 MD5）
      const crypto = await import('crypto');
      const passwordHash = crypto.createHash('md5').update(password).digest('hex');

      const users = await query<any[]>(`
        SELECT id, name, depart, phone, mail, stuid, isAdmin
        FROM jdhmd
        WHERE id = ? AND password = ?
      `, [username, passwordHash]);

      if (users.length > 0) {
        const user = users[0] as any;
        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
        return NextResponse.json({
          success: true,
          token,
          user: {
            id: user.id,
            stuid: user.stuid, // 添加学号，用于企业微信通知
            name: user.name,
            depart: user.depart,
            phone: user.phone,
            mail: user.mail,
            isAdmin: user.isAdmin === 1,
            type: 'individual',
          },
        });
      }
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
