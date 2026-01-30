import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface FormalProposalItem {
  zstaId: number;
  zstabh: string;
  title: string;
  reason: string;
  suggest: string;
  management: string;
  attachment: string;
  process: number;
  reply: string;
  clickCount: number;
  createAt: string;
  sourceTajyIds?: string;
}

// GET /api/formal-proposals - 获取正式提案列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const keyword = searchParams.get('keyword');
    const searchType = searchParams.get('type');
    const process = searchParams.get('process'); // 处理状态筛选
    const month = searchParams.get('month'); // 月份筛选 (YYYY-MM)
    const startDate = searchParams.get('startDate'); // 开始日期 (YYYY-MM-DD)
    const endDate = searchParams.get('endDate'); // 结束日期 (YYYY-MM-DD)
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    // 处理搜索条件
    if (keyword) {
      if (searchType === 'title') {
        whereClause = 'WHERE title LIKE ?';
        params.push(`%${keyword}%`);
      } else if (searchType === 'code') {
        whereClause = 'WHERE zstabh LIKE ?';
        params.push(`%${keyword}%`);
      } else if (searchType === 'management') {
        whereClause = 'WHERE management LIKE ?';
        params.push(`%${keyword}%`);
      }
    }

    // 处理状态筛选
    if (process !== null && process !== '') {
      const processNum = parseInt(process);
      if (!whereClause) {
        whereClause = 'WHERE process = ?';
      } else {
        whereClause += ' AND process = ?';
      }
      params.push(processNum);
    }

    // 处理月份筛选（优先级高于日期范围）
    if (month) {
      if (!whereClause) {
        whereClause = 'WHERE DATE_FORMAT(createAt, "%Y-%m") = ?';
      } else {
        whereClause += ' AND DATE_FORMAT(createAt, "%Y-%m") = ?';
      }
      params.push(month);
    }

    // 处理日期范围筛选
    if (startDate && endDate) {
      if (!whereClause) {
        whereClause = 'WHERE DATE(createAt) BETWEEN ? AND ?';
      } else {
        whereClause += ' AND DATE(createAt) BETWEEN ? AND ?';
      }
      params.push(startDate, endDate);
    } else if (startDate) {
      if (!whereClause) {
        whereClause = 'WHERE DATE(createAt) >= ?';
      } else {
        whereClause += ' AND DATE(createAt) >= ?';
      }
      params.push(startDate);
    } else if (endDate) {
      if (!whereClause) {
        whereClause = 'WHERE DATE(createAt) <= ?';
      } else {
        whereClause += ' AND DATE(createAt) <= ?';
      }
      params.push(endDate);
    }

    const proposals = await query<FormalProposalItem>(`
      SELECT
        zstaId, zstabh, title, reason, suggest, management,
        attachment, process, reply, clickCount, createAt, sourceTajyIds
      FROM zsta
      ${whereClause}
      ORDER BY zstaId DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params);

    // 获取总数
    const [countResult] = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM zsta ${whereClause}
    `, params);

    return NextResponse.json({
      success: true,
      data: proposals,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching formal proposals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch formal proposals',
    }, { status: 500 });
  }
}
