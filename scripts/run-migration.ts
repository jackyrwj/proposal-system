// 执行数据库迁移脚本
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'rootpass',
  database: 'jdhtagz_local',
  multipleStatements: true,
});

async function runMigration() {
  try {
    console.log('开始执行数据库迁移...');

    // 检查字段是否已存在
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'jdhtagz_local'
        AND TABLE_NAME = 'zsta'
        AND COLUMN_NAME IN ('sourceTajyIds', 'mergedBy')
    `);

    const existingColumns = (columns as any[]).map((c: any) => c.COLUMN_NAME);
    console.log('已存在的字段:', existingColumns);

    // 添加 sourceTajyIds 字段
    if (!existingColumns.includes('sourceTajyIds')) {
      await pool.query(`
        ALTER TABLE zsta
        ADD COLUMN sourceTajyIds TEXT COMMENT '源提案建议ID列表，逗号分隔' AFTER management
      `);
      console.log('✓ 已添加 sourceTajyIds 字段');
    } else {
      console.log('- sourceTajyIds 字段已存在，跳过');
    }

    // 添加 mergedBy 字段
    if (!existingColumns.includes('mergedBy')) {
      await pool.query(`
        ALTER TABLE zsta
        ADD COLUMN mergedBy TINYINT DEFAULT 0 COMMENT '是否为AI合并生成：0-否 1-是' AFTER sourceTajyIds
      `);
      console.log('✓ 已添加 mergedBy 字段');
    } else {
      console.log('- mergedBy 字段已存在，跳过');
    }

    // 添加索引
    const [indexes] = await pool.query(`
      SHOW INDEX FROM zsta WHERE Key_name = 'idx_mergedBy'
    `);
    if ((indexes as any[]).length === 0) {
      await pool.query(`
        ALTER TABLE zsta ADD INDEX idx_mergedBy (mergedBy)
      `);
      console.log('✓ 已添加 idx_mergedBy 索引');
    } else {
      console.log('- idx_mergedBy 索引已存在，跳过');
    }

    console.log('\n数据库迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
