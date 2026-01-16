import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';

// POST /api/admin/zsta - Create a new formal proposal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, reason, suggest, management, process } = body;

    if (!title) {
      return NextResponse.json({
        success: false,
        error: '标题不能为空',
      }, { status: 400 });
    }

    // 先插入记录（zstabh 先用临时值）
    const result = await query<{ insertId: number }[]>(`
      INSERT INTO zsta (zstabh, title, reason, suggest, management, process, createAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['', title, reason || '', suggest || '', management || '', process ?? 0, getChinaTimeString()]);

    const zstaId = (result as any).insertId;

    // 生成正式提案编号：年份 + ZSTA + zstaId (3位)
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const year = chinaTime.getFullYear();
    const zstabh = `${year}ZSTA${String(zstaId).padStart(3, '0')}`;

    // 更新 zstabh
    await query(`
      UPDATE zsta SET zstabh = ? WHERE zstaId = ?
    `, [zstabh, zstaId]);

    return NextResponse.json({
      success: true,
      data: { zstaId, zstabh },
      message: '创建成功',
    });
  } catch (error) {
    console.error('Error creating formal proposal:', error);
    return NextResponse.json({
      success: false,
      error: '创建失败',
    }, { status: 500 });
  }
}
