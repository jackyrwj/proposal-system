import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取流程配置
export async function GET() {
  try {
    // 从数据库获取配置，如果表不存在则返回默认配置
    const result = await query(`
      SELECT * FROM flow_node_config
      ORDER BY proposalType, stepOrder
    `);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // 如果表不存在，返回空数组，前端将使用默认配置
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}

// 保存流程配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tajy, zsta } = body;

    // 创建表（如果不存在）
    await query(`
      CREATE TABLE IF NOT EXISTS flow_node_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proposalType ENUM('tajy', 'zsta') NOT NULL,
        stepOrder INT NOT NULL,
        nodeName VARCHAR(50) NOT NULL,
        expectedDays INT DEFAULT 0,
        description TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_step (proposalType, stepOrder)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 清空现有配置
    await query(`DELETE FROM flow_node_config`);

    // 插入新配置 - 提案建议
    if (tajy && Array.isArray(tajy)) {
      for (const node of tajy) {
        await query(
          `INSERT INTO flow_node_config (proposalType, stepOrder, nodeName, expectedDays, isActive)
           VALUES (?, ?, ?, ?, ?)`,
          ['tajy', node.stepOrder, node.nodeName, node.expectedDays, node.isActive ?? true]
        );
      }
    }

    // 插入新配置 - 正式提案
    if (zsta && Array.isArray(zsta)) {
      for (const node of zsta) {
        await query(
          `INSERT INTO flow_node_config (proposalType, stepOrder, nodeName, expectedDays, isActive)
           VALUES (?, ?, ?, ?, ?)`,
          ['zsta', node.stepOrder, node.nodeName, node.expectedDays, node.isActive ?? true]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '配置保存成功',
    });
  } catch (error: any) {
    console.error('Error saving flow config:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '保存失败',
    }, { status: 500 });
  }
}
