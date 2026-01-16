-- 为提案建议表添加附件字段
-- 执行: mysql -u root -p jdhtagz < sql/add_attachment_column.sql

USE jdhtagz;

-- 检查列是否存在，不存在则添加
SET @dbname = DATABASE();
SET @tablename = 'tajy';
SET @columnname = 'attachment';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(500) DEFAULT NULL COMMENT ''附件路径''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
