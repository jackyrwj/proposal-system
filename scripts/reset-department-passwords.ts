/**
 * 数据库迁移脚本：将部门密码从 MD5 哈希转换为 AES 加密存储
 *
 * 运行方式: npx ts-node scripts/reset-department-passwords.ts
 */

import { query } from '../lib/db';
import { encryptPassword, generateRandomPassword } from '../lib/password';

interface Department {
  departId: string;
  departName: string;
  account: string;
}

async function migratePasswords() {
  console.log('开始迁移部门密码...\n');

  try {
    // 获取所有部门
    const departments = await query<Department>(
      `SELECT departId, departName, account FROM department`
    );

    if (!departments || departments.length === 0) {
      console.log('没有找到部门数据');
      return;
    }

    console.log(`找到 ${departments.length} 个部门，开始重置密码...\n`);

    for (const dept of departments) {
      // 生成随机密码
      const newPassword = generateRandomPassword(8);
      const encryptedPassword = encryptPassword(newPassword);

      // 更新数据库
      await query(`
        UPDATE department SET password = ?, needChangePassword = 1 WHERE departId = ?
      `, [encryptedPassword, dept.departId]);

      console.log(`✓ ${dept.departName} (${dept.account}): ${newPassword}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`密码重置完成！共 ${departments.length} 个部门`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('迁移失败:', error);
  }
}

migratePasswords();
