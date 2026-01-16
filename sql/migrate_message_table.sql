-- ============================================
-- 企业微信消息记录表
-- ============================================

CREATE TABLE IF NOT EXISTS wework_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    studentID VARCHAR(50) NOT NULL COMMENT '学号',
    templateId VARCHAR(50) NOT NULL DEFAULT 'CUURWNXKM2' COMMENT '模板ID',
    Parameters JSON COMMENT '模板参数',
    msgid VARCHAR(255) DEFAULT '' COMMENT '消息ID',
    success TINYINT DEFAULT 0 COMMENT '是否成功：1成功，0失败',
    error VARCHAR(500) DEFAULT '' COMMENT '错误信息',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
    INDEX idx_studentID (studentID),
    INDEX idx_msgid (msgid),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企业微信消息记录表';
