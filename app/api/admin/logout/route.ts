import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '登出成功',
  });

  // 清除 Cookie
  response.cookies.delete('adminToken');
  response.cookies.delete('adminUser');

  return response;
}
