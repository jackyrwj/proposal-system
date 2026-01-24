import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * 数据库迁移脚本
 * 访问 /api/migrate 来执行迁移
 */
export async function GET() {
  const results: any[] = [];

  try {
    // 查看表结构
    const columns = await query<any>(`SHOW COLUMNS FROM jdhmd`);
    results.push({ name: 'jdhmd 表结构', data: columns });
  } catch (error: any) {
    results.push({ name: 'jdhmd 表结构', error: error.message });
  }

  // 查看前几条数据
  try {
    const rows = await query<any>(`SELECT * FROM jdhmd LIMIT 3`);
    results.push({ name: 'jdhmd 数据示例', data: rows });
  } catch (error: any) {
    results.push({ name: 'jdhmd 数据示例', error: error.message });
  }

  return NextResponse.json({
    success: true,
    results,
  });
}
