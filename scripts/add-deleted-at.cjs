const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'rootpass',
    database: 'jdhtagz_local'
  });

  try {
    // 检查字段是否存在
    const [columns] = await connection.query("DESCRIBE tajy");
    const hasDeletedAt = columns.some(col => col.Field === 'deletedAt');

    if (hasDeletedAt) {
      console.log('deletedAt 字段已存在');
    } else {
      // 添加 deletedAt 字段
      await connection.query("ALTER TABLE tajy ADD COLUMN deletedAt DATETIME DEFAULT NULL AFTER createAt");
      console.log('deletedAt 字段添加成功');
    }
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
