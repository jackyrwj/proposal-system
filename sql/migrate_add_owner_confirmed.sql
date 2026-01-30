-- ============================================
-- 添加提案人确认字段 - 数据库迁移
-- 用于记录提案人是否已确认知悉处理结果
-- ============================================

-- 为提案建议表添加提案人确认字段
-- ownerConfirmed: 0-未确认, 1-已确认
ALTER TABLE tajy
ADD COLUMN IF NOT EXISTS ownerConfirmed TINYINT(1) DEFAULT 0 COMMENT '提案人是否已确认知悉处理结果' AFTER description;

-- 为提案建议表添加提案人确认时间字段
ALTER TABLE tajy
ADD COLUMN IF NOT EXISTS ownerConfirmedAt DATETIME DEFAULT NULL COMMENT '提案人确认时间' AFTER ownerConfirmed;
