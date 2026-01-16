import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取教代会成员列表（用于附议人选择）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const keyword = searchParams.get('keyword') || '';
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT id, name, depart FROM jdhmd';
    let countSql = 'SELECT COUNT(*) as total FROM jdhmd';
    const params: any[] = [];

    if (keyword) {
      sql += ' WHERE name LIKE ? OR depart LIKE ?';
      countSql += ' WHERE name LIKE ? OR depart LIKE ?';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ` ORDER BY id LIMIT ${pageSize} OFFSET ${offset}`;

    const [members, countResult] = await Promise.all([
      query<any[]>(sql, params),
      query<any[]>(countSql, keyword ? [`%${keyword}%`, `%${keyword}%`] : [])
    ]);

    const total = (countResult[0] as any)?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        list: Array.isArray(members) ? members : [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
