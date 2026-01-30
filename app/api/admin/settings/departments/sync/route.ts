import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { fetchUnitsFromGG0008 } from '@/lib/cdsp';

/**
 * POST /api/admin/settings/departments/sync
 * 从 CDSP GG0008 同步部门数据（全量替换）
 */
export async function POST() {
  try {
    // 从 CDSP 获取单位数据 (GG0008)，只获取单位层次为2的职能部门
    const cdspUnits = await fetchUnitsFromGG0008();

    if (cdspUnits.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未获取到部门数据',
      }, { status: 500 });
    }

    let added = 0;
    let deleted = 0;
    let total = 0;

    // 统计需要处理的数据（已启用的）
    for (const unit of cdspUnits) {
      const code = unit['单位代码'];
      const name = unit['单位名称'];
      const isUsed = unit['是否使用'] === '1';

      if (code && name && isUsed) {
        total++;
      }
    }

    // 全量替换：先删除所有现有部门（保留可能不在CDSP中的数据可以注释掉这行）
    await query(`DELETE FROM department`);
    deleted = 1; // 简化计数，实际删除数量不展示

    // 生成随机密码函数
    const generatePasswordHash = async () => {
      const crypto = await import('crypto');
      const password = crypto.randomBytes(4).toString('hex');
      return { password, hash: crypto.createHash('md5').update(password).digest('hex') };
    };

    // 批量插入新数据
    for (const unit of cdspUnits) {
      const code = unit['单位代码'];
      const name = unit['单位名称'];
      const isUsed = unit['是否使用'] === '1';

      // 只处理启用的部门
      if (!code || !name || !isUsed) {
        continue;
      }

      const { hash } = await generatePasswordHash();

      await query(`
        INSERT INTO department (departId, departName, account, password, needChangePassword)
        VALUES (?, ?, ?, ?, 1)
      `, [code, name, code, hash]);
      added++;
    }

    return NextResponse.json({
      success: true,
      message: `同步完成`,
      data: {
        total: cdspUnits.length,
        added,
        deleted: 1, // 全量替换，删除的旧记录数不细分
        skipped: cdspUnits.length - total, // 未启用/无代码/无名称的数量
      },
    });
  } catch (error) {
    console.error('Error syncing departments:', error);
    return NextResponse.json({
      success: false,
      error: '同步失败',
    }, { status: 500 });
  }
}
