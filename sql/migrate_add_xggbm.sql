-- ============================================
-- 添加相关职能部门字段 - 数据库迁移
-- ============================================

-- 为提案建议表添加相关职能部门字段
-- xggbm = 相关职能部门 (XiangGan ZhiNeng BuMen)
ALTER TABLE tajy
ADD COLUMN IF NOT EXISTS xggbm TEXT DEFAULT NULL COMMENT '相关职能部门' AFTER depart;

-- 为正式提案表添加相关职能部门字段
ALTER TABLE zsta
ADD COLUMN IF NOT EXISTS xggbm TEXT DEFAULT NULL COMMENT '相关职能部门' AFTER depart;
