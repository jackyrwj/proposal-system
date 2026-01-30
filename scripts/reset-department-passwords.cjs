/**
 * 数据库迁移脚本：将部门密码从 MD5 哈希转换为 AES 加密存储
 *
 * 运行方式: node scripts/reset-department-passwords.cjs
 */

const crypto = require('crypto');
const mysql = require('mysql2/promise');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// 固定加密密钥（32字节）
const ENCRYPTION_KEY = crypto.createHash('sha256').update('jdhtagz_secure_key_32bytes!!!!').digest();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'jdhtagz_local',
};

// 加密函数
function encryptPassword(password) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// 生成随机密码
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function migratePasswords() {
  console.log('开始迁移部门密码...\n');

  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);

    // 先修改表结构，扩大 password 字段长度
    console.log('正在修改表结构...');
    await connection.execute("ALTER TABLE department MODIFY COLUMN password VARCHAR(255) NOT NULL COMMENT '加密后的密码'");
    console.log('表结构修改完成。\n');

    // 获取所有部门
    const [departments] = await connection.execute(
      'SELECT departId, departName, account FROM department'
    );

    if (departments.length === 0) {
      console.log('没有找到部门数据');
      return;
    }

    console.log(`找到 ${departments.length} 个部门，开始重置密码...\n`);

    for (const dept of departments) {
      // 生成随机密码
      const newPassword = generateRandomPassword(8);
      const encryptedPassword = encryptPassword(newPassword);

      // 更新数据库
      await connection.execute(
        'UPDATE department SET password = ?, needChangePassword = 1 WHERE departId = ?',
        [encryptedPassword, dept.departId]
      );

      console.log(`✓ ${dept.departName} (${dept.account}): ${newPassword}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`密码重置完成！共 ${departments.length} 个部门`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migratePasswords();
