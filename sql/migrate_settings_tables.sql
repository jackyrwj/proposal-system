-- ============================================
-- 系统管理相关表
-- ============================================

-- 系统参数表
CREATE TABLE IF NOT EXISTS system_params (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enableSign TINYINT DEFAULT 1 COMMENT '提案附议功能开关：1开启，0关闭',
    homeImage VARCHAR(500) DEFAULT '' COMMENT '首页图片URL',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数表';

-- 初始化系统参数
INSERT INTO system_params (id, enableSign, homeImage) VALUES (1, 1, '') ON DUPLICATE KEY UPDATE id=id;

-- 页面配置表
CREATE TABLE IF NOT EXISTS page_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL COMMENT '配置键名',
    label VARCHAR(100) NOT NULL COMMENT '配置标签',
    value VARCHAR(255) DEFAULT '' COMMENT '配置值',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='页面配置表';

-- 初始化页面配置
INSERT INTO page_configs (id, `key`, label, value) VALUES
(1, 'xwdt', '提案工作动态：', ''),
(2, 'gzjz', '提案工作进展：', ''),
(3, 'zsta', '正式提案查询：', ''),
(4, 'tajy', '提案建议查询：', ''),
(5, 'zjta', '征集提案建议：', ''),
(6, 'gytagz', '关于提案工作：', '')
ON DUPLICATE KEY UPDATE id=id;

-- 教代会成员表
CREATE TABLE IF NOT EXISTS union_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    cardNo VARCHAR(50) NOT NULL COMMENT '校园卡号',
    unit VARCHAR(100) DEFAULT '' COMMENT '单位',
    position VARCHAR(50) DEFAULT '' COMMENT '职务',
    year VARCHAR(20) DEFAULT '' COMMENT '届别',
    phone VARCHAR(20) DEFAULT '' COMMENT '联系电话',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_cardNo (cardNo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教代会成员表';

-- 职能部门表
CREATE TABLE IF NOT EXISTS departments (
    deptId VARCHAR(10) PRIMARY KEY COMMENT '部门ID',
    name VARCHAR(100) NOT NULL COMMENT '部门名称',
    account VARCHAR(50) NOT NULL COMMENT '登录账号',
    password VARCHAR(100) DEFAULT '123456' COMMENT '登录密码',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_account (account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='职能部门表';

-- 初始化部门数据（示例）
INSERT INTO departments (deptId, name, account, password) VALUES
('1000001', '党政办公室', 'account1', '123456'),
('1000002', '党委组织部/统战部', 'account2', '123456'),
('1000003', '党委宣传部', 'account3', '123456'),
('1000004', '纪检（监察）室', 'account4', '123456'),
('1000005', '工会', 'account5', '123456')
ON DUPLICATE KEY UPDATE deptId=deptId;
