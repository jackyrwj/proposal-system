import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取部门列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const keyword = searchParams.get('keyword') || '';
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT departId, departName, description FROM department WHERE departName IS NOT NULL AND departName != ""';
    let countSql = 'SELECT COUNT(*) as total FROM department WHERE departName IS NOT NULL AND departName != ""';
    const params: any[] = [];

    if (keyword) {
      sql += ' AND departName LIKE ?';
      countSql += ' AND departName LIKE ?';
      params.push(`%${keyword}%`);
    }

    sql += ` ORDER BY departId LIMIT ${pageSize} OFFSET ${offset}`;

    const [depts, countResult] = await Promise.all([
      query<any[]>(sql, params),
      query<any[]>(countSql, keyword ? [`%${keyword}%`] : [])
    ]);

    const total = (countResult[0] as any)?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        list: Array.isArray(depts) ? depts : [],
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
