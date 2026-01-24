import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { fetchDepartments } from '@/lib/cdsp';

/**
 * POST /api/admin/settings/departments/sync
 * 从 CDSP 同步部门数据
 */
export async function POST() {
  try {
    // 从 CDSP 获取部门数据
    const cdspDepartments = await fetchDepartments();

    if (cdspDepartments.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未获取到部门数据',
      }, { status: 500 });
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;
    // 详细跳过原因统计
    let skipNotUsed = 0;      // 未启用
    let skipNoCode = 0;       // 无代码
    let skipNoName = 0;       // 无名称
    let skipUnchanged = 0;    // 已存在且名称未变

    // 查看现有部门
    const existingDepts = await query<{ departId: string; departName: string }>(`
      SELECT departId, departName FROM department
    `);

    const existingMap = new Map(existingDepts.map(d => [d.departId, d.departName]));

    // 处理每个部门
    for (const dept of cdspDepartments) {
      const code = dept['代码'];
      const name = dept['名称'];
      const isUsed = dept['是否使用'] === '1';

      // 只处理启用的部门
      if (!isUsed) {
        skipNotUsed++;
        skipped++;
        continue;
      }

      if (!code) {
        skipNoCode++;
        skipped++;
        continue;
      }

      if (!name) {
        skipNoName++;
        skipped++;
        continue;
      }

      // 检查是否已存在
      const existingName = existingMap.get(code);

      if (existingName) {
        // 已存在，检查是否需要更新名称
        if (existingName !== name) {
          await query(`
            UPDATE department SET departName = ? WHERE departId = ?
          `, [name, code]);
          updated++;
        } else {
          skipUnchanged++;
          skipped++;
        }
      } else {
        // 不存在，添加新部门
        // 生成随机密码
        const crypto = await import('crypto');
        const password = crypto.randomBytes(4).toString('hex');
        const passwordHash = crypto.createHash('md5').update(password).digest('hex');

        // 账号使用部门代码（纯数字部分）
        const account = code.replace(/\D/g, '') || code;

        await query(`
          INSERT INTO department (departId, departName, account, password, needChangePassword)
          VALUES (?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE departName = VALUES(departName)
        `, [code, name, account, passwordHash]);
        added++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成`,
      data: {
        total: cdspDepartments.length,
        added,
        updated,
        skipped,
        skipDetails: {
          notUsed: skipNotUsed,      // 未启用
          noCode: skipNoCode,        // 无代码
          noName: skipNoName,        // 无名称
          unchanged: skipUnchanged,  // 已存在且名称未变
        },
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
