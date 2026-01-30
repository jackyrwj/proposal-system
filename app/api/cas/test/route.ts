import { NextRequest, NextResponse } from 'next/server';

const CAS_SERVER = 'https://authserver.szu.edu.cn/authserver/';
const SERVICE_URL = process.env.NEXT_PUBLIC_SITE_URL + '/api/cas/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticket = searchParams.get('ticket');
  const action = searchParams.get('action');

  // 1. 发起登录 - 重定向到 CAS 登录页
  if (action === 'login') {
    const loginUrl = `${CAS_SERVER}login?service=${encodeURIComponent(SERVICE_URL)}`;
    console.log('[CAS] 发起登录，重定向到:', loginUrl);
    return NextResponse.redirect(loginUrl);
  }

  // 2. 登出
  if (action === 'logout') {
    const logoutUrl = `${CAS_SERVER}logout?service=${encodeURIComponent(SERVICE_URL)}`;
    return NextResponse.redirect(logoutUrl);
  }

  // 3. CAS 回调 - 验证 ticket
  if (ticket) {
    try {
      const validateUrl = `${CAS_SERVER}serviceValidate?format=json&ticket=${ticket}&service=${encodeURIComponent(SERVICE_URL)}`;

      console.log('[CAS Callback] 验证 ticket:', ticket);
      console.log('[CAS Callback] 验证URL:', validateUrl);

      const response = await fetch(validateUrl);
      const text = await response.text();
      console.log('[CAS Callback] 响应原始文本:', text);

      // 尝试解析 JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // 如果不是 JSON，返回原始文本用于调试
        return NextResponse.json({
          success: false,
          message: 'CAS 服务器未返回 JSON 格式',
          rawResponse: text,
          validateUrl,
        });
      }

      console.log('[CAS Callback] 解析后的数据:', JSON.stringify(data, null, 2));

      // 检查验证是否成功
      if (data.serviceResponse?.authenticationSuccess) {
        const user = data.serviceResponse.authenticationSuccess;
        return NextResponse.json({
          success: true,
          message: 'CAS 认证成功！',
          data: {
            userId: user.user,           // 学号/职工号
            userName: user.attributes?.cn || user.cn, // 姓名
            cardId: user.attributes?.alias || user.alias, // 校园卡号
            orgName: user.attributes?.eduPersonOrgDN || user.eduPersonOrgDN, // 学院
            containerId: user.attributes?.containerId || user.containerId, // 用户类别
            allAttributes: user.attributes || {},
            rawUser: user,
          },
        });
      }

      // 验证失败
      if (data.serviceResponse?.authenticationFailure) {
        return NextResponse.json({
          success: false,
          message: 'Ticket 验证失败',
          error: data.serviceResponse.authenticationFailure,
        });
      }

      return NextResponse.json({
        success: false,
        message: '未知的 CAS 响应格式',
        data,
      });
    } catch (error: any) {
      console.error('[CAS Callback] 验证出错:', error);
      return NextResponse.json({
        success: false,
        message: 'CAS 验证请求失败',
        error: error.message,
      }, { status: 500 });
    }
  }

  // 4. 默认 - 显示测试页面
  return new NextResponse(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CAS 登录测试</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #1779DC; }
    .box { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; background: #f9f9f9; }
    .btn { display: inline-block; padding: 12px 24px; background: #1779DC; color: white; text-decoration: none; border-radius: 6px; margin: 5px; }
    .btn:hover { background: #2861AE; }
    .btn.secondary { background: #6c757d; }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 6px; overflow-x: auto; }
    .success { color: #28a745; font-weight: bold; }
    .error { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <h1>深圳大学 CAS 统一身份认证测试</h1>

  <div class="box">
    <h3>配置信息</h3>
    <p><strong>CAS 服务器：</strong><code>https://authserver.szu.edu.cn/authserver/</code></p>
    <p><strong>回调地址：</strong><code>${SERVICE_URL}</code></p>
  </div>

  <div class="box">
    <h3>测试步骤</h3>
    <ol>
      <li>点击下方"登录测试"按钮，将跳转到深大统一身份认证页面</li>
      <li>使用深大账号密码登录</li>
      <li>登录成功后将跳转回本页面并显示用户信息</li>
    </ol>
  </div>

  <div class="box">
    <h3>操作</h3>
    <a href="?action=login" class="btn">登录测试</a>
    <a href="?action=logout" class="btn secondary">登出</a>
  </div>

  <div class="box">
    <h3>CAS 流程说明</h3>
    <p><strong>1. 发起登录：</strong>重定向到 <code>CAS_SERVER/login?service=SERVICE_URL</code></p>
    <p><strong>2. 用户登录：</strong>在 CAS 服务器完成登录</p>
    <p><strong>3. 回调验证：</strong>CAS 返回 ticket，后端调用 <code>CAS_SERVER/serviceValidate?ticket=xxx&service=xxx</code> 验证</p>
    <p><strong>4. 获取用户信息：</strong>验证成功后获取用户信息（学号、姓名、学院等）</p>
  </div>
</body>
</html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
