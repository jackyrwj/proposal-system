import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/admin/settings/params - 获取系统参数
export async function GET() {
  try {
    // 获取系统参数
    const paramsResult = await query<{ enableSign: number; homeImage: string }>(`
      SELECT enableSign, homeImage FROM system_params LIMIT 1
    `);

    let params = paramsResult[0] || { enableSign: 1, homeImage: '' };

    // 获取栏目配置
    const configsResult = await query<{ id: number; key: string; label: string; value: string }>(`
      SELECT id, \`key\`, label, \`value\` FROM page_configs
    `);

    return NextResponse.json({
      success: true,
      data: {
        enableSign: params.enableSign ?? 1,
        homeImage: params.homeImage || '',
        pageConfigs: configsResult,
      },
    });
  } catch (error) {
    console.error('Error fetching params:', error);
    return NextResponse.json({
      success: false,
      error: '获取参数失败',
    }, { status: 500 });
  }
}

// POST /api/admin/settings/params - 保存系统参数
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enableSign, homeImage, pageConfigs } = body;

    console.log('=== POST /api/admin/settings/params ===');
    console.log('Request body:', { enableSign, homeImage, pageConfigs });
    console.log('enableSign type:', typeof enableSign);
    console.log('enableSign value:', enableSign);

    // 更新系统参数
    const existingParams = await query<{ id: number }>(`SELECT id, enableSign FROM system_params LIMIT 1`);
    console.log('Existing params:', existingParams);

    if (existingParams.length > 0) {
      await query(`
        UPDATE system_params SET enableSign = ?, homeImage = ? WHERE id = ?
      `, [enableSign !== undefined ? enableSign : 1, homeImage || '', existingParams[0].id]);
      console.log('Updated with ID:', existingParams[0].id);
    } else {
      await query(`
        INSERT INTO system_params (enableSign, homeImage) VALUES (?, ?)
      `, [enableSign !== undefined ? enableSign : 1, homeImage || '']);
      console.log('Inserted new record');
    }

    // 验证更新结果
    const verifyParams = await query<{ enableSign: number }>(`SELECT enableSign FROM system_params LIMIT 1`);
    console.log('Verify params after save:', verifyParams);

    // 更新栏目配置
    if (pageConfigs && Array.isArray(pageConfigs)) {
      for (const config of pageConfigs) {
        if (config.id > 0) {
          await query(`UPDATE page_configs SET \`value\` = ? WHERE id = ?`, [config.value, config.id]);
        } else {
          await query(`INSERT INTO page_configs (\`key\`, label, \`value\`) VALUES (?, ?, ?)`, [config.key, config.label, config.value]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '保存成功',
    });
  } catch (error) {
    console.error('Error saving params:', error);
    return NextResponse.json({
      success: false,
      error: '保存失败',
    }, { status: 500 });
  }
}
