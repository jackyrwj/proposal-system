-- ============================================
-- 提案附议确认表
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_endorsements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proposalId INT NOT NULL COMMENT '提案ID (tajyId)',
    endorserId VARCHAR(20) NOT NULL COMMENT '附议人ID (jdhmd.id)',
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending' COMMENT '状态: pending-待确认, accepted-已接受, rejected-已拒绝',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '邀请时间',
    respondedAt DATETIME DEFAULT NULL COMMENT '响应时间',
    UNIQUE KEY uk_proposal_endorser (proposalId, endorserId),
    INDEX idx_proposal (proposalId),
    INDEX idx_endorser (endorserId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提案附议确认表';
