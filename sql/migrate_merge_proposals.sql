-- ============================================
-- 提案建议转正式提案功能 - 数据库迁移
-- ============================================

-- 为正式提案表添加源提案建议关联字段
ALTER TABLE zsta
ADD COLUMN IF NOT EXISTS sourceTajyIds TEXT COMMENT '源提案建议ID列表，逗号分隔' AFTER management,
ADD COLUMN IF NOT EXISTS mergedBy TINYINT DEFAULT 0 COMMENT '是否为AI合并生成：0-否 1-是' AFTER sourceTajyIds;

-- 添加索引以提高查询性能
ALTER TABLE zsta ADD INDEX IF NOT EXISTS idx_mergedBy (mergedBy);
