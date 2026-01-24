import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只保护 /admin 路径
  if (pathname.startsWith('/admin')) {
    const userCookie = request.cookies.get('user');
    const tokenCookie = request.cookies.get('token');

    if (!userCookie || !tokenCookie) {
      // 未登录，重定向到前台登录页
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 验证用户是否有管理员权限
    try {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      if (!user.isAdmin) {
        // 不是管理员，重定向到首页
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (e) {
      // Cookie 解析失败，重新登录
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
