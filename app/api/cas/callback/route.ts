import { NextRequest, NextResponse } from 'next/server';

const CAS_SERVER = 'https://authserver.szu.edu.cn/authserver/';
const SERVICE_URL = process.env.NEXT_PUBLIC_SITE_URL + '/api/cas/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticket = searchParams.get('ticket');

  if (!ticket) {
    return NextResponse.json({ success: false, error: '缺少 ticket 参数' }, { status: 400 });
  }

  try {
    // 验证 ticket
    const validateUrl = `${CAS_SERVER}serviceValidate?format=json&ticket=${ticket}&service=${encodeURIComponent(SERVICE_URL)}`;

    console.log('[CAS Callback] 验证 ticket:', ticket);

    const response = await fetch(validateUrl);
    const text = await response.text();
    const data = JSON.parse(text);

    console.log('[CAS Callback] 响应:', data);

    // 验证成功，获取用户信息
    if (data.serviceResponse?.authenticationSuccess) {
      const authUser = data.serviceResponse.authenticationSuccess;
      const userId = authUser.user; // 学号/职工号
      const userName = authUser.attributes?.cn || authUser.cn || ''; // 姓名
      const cardId = authUser.attributes?.alias || authUser.alias || ''; // 校园卡号
      const orgName = authUser.attributes?.eduPersonOrgDN || authUser.eduPersonOrgDN || ''; // 学院

      // 查询数据库获取完整用户信息
      const { query } = await import('@/lib/db');
      const users: any[] = await query(`
        SELECT id, name, depart, phone, mail, stuid, isAdmin
        FROM jdhmd
        WHERE stuid = ? OR id = ?
      `, [userId, userId]);

      if (users.length === 0) {
        // 用户不在数据库中，显示错误页面
        return new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录失败</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
    h1 { color: #dc3545; }
    .box { border: 1px solid #ddd; padding: 30px; margin: 20px 0; border-radius: 8px; background: #f9f9f9; }
    a { color: #1779DC; text-decoration: none; }
  </style>
</head>
<body>
  <h1>登录失败</h1>
  <div class="box">
    <p>您不在教代会成员名单中，无法登录本系统。</p>
    <p>如需加入，请联系校工会教代会。</p>
    <p><strong>您的信息：</strong></p>
    <p>学号：${userId}</p>
    <p>姓名：${userName}</p>
    <p>学院：${orgName}</p>
  </div>
  <a href="/">返回首页</a>
</body>
</html>
        `, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      const dbUser = users[0];
      const token = Buffer.from(`${dbUser.id}:${Date.now()}`).toString('base64');

      const user = {
        id: dbUser.id,
        stuid: dbUser.stuid,
        name: dbUser.name,
        depart: dbUser.depart,
        phone: dbUser.phone,
        mail: dbUser.mail,
        isAdmin: dbUser.isAdmin === 1,
        type: 'individual',
      };

      // 返回包含用户信息和 token 的页面，自动保存到 localStorage 并跳转
      return new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>登录成功</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #1779DC 0%, #2861AE 100%); }
    .box { text-align: center; color: white; }
    .spinner { width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h2>登录成功，正在跳转...</h2>
    <p>欢迎，${user.name}</p>
  </div>
  <script>
    // 保存用户信息和 token
    const user = ${JSON.stringify(user)};
    const token = '${token}';

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    document.cookie = 'user=' + encodeURIComponent(JSON.stringify(user)) + '; path=/; max-age=' + (7 * 24 * 60 * 60);
    document.cookie = 'token=' + token + '; path=/; max-age=' + (7 * 24 * 60 * 60);

    // 触发登录事件
    window.dispatchEvent(new Event('userLoggedIn'));

    // 获取跳转目标：优先使用 URL 参数 redirect，其次使用 sessionStorage，最后默认首页
    const urlParams = new URLSearchParams(window.location.search);
    let redirectUrl = urlParams.get('redirect');
    if (!redirectUrl) {
      redirectUrl = sessionStorage.getItem('loginRedirect');
    }
    if (!redirectUrl) {
      redirectUrl = '/';
    }
    // 清除 sessionStorage 中的登录跳转目标
    sessionStorage.removeItem('loginRedirect');

    // 跳转到目标页面
    setTimeout(function() {
      window.location.href = redirectUrl;
    }, 500);
  </script>
</body>
</html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 验证失败
    if (data.serviceResponse?.authenticationFailure) {
      return new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>认证失败</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
    h1 { color: #dc3545; }
    .box { border: 1px solid #ddd; padding: 30px; margin: 20px 0; border-radius: 8px; background: #f9f9f9; }
    a { color: #1779DC; text-decoration: none; }
  </style>
</head>
<body>
  <h1>CAS 认证失败</h1>
  <div class="box">
    <p><strong>错误代码:</strong> ${data.serviceResponse.authenticationFailure.code}</p>
    <p><strong>错误描述:</strong> ${data.serviceResponse.authenticationFailure.description}</p>
  </div>
  <a href="/login">返回登录</a>
</body>
</html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new NextResponse('未知响应格式', { status: 500 });
  } catch (error: any) {
    console.error('[CAS Callback] 错误:', error);
    return new NextResponse('验证失败: ' + error.message, { status: 500 });
  }
}
