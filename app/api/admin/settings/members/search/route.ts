import { NextRequest, NextResponse } from 'next/server';
import { searchTeacher } from '@/lib/cdsp';

/**
 * GET /api/admin/settings/members/search
 * 搜索教职工人员信息
 * Query params:
 *   - keyword: 搜索关键词（校园卡号、姓名、所在单位名称、职工号）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    console.log('[search] 开始搜索, keyword:', keyword);

    if (!keyword || keyword.trim().length < 1) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const teachers = await searchTeacher(keyword);

    console.log('[search] 搜索结果数量:', teachers.length);

    // 映射中文字段名到前端使用的格式
    const formattedData = teachers.map(t => ({
      cardNo: t['校园卡号'] || t['XYH'] || '',          // 校园卡号
      employeeId: t['职工号'] || '',        // 职工号
      name: t['姓名'] || '',                // 姓名
      unit: t['标准单位名称'] || '',        // 标准单位名称
      unitCode: t['标准单位代码'] || '',    // 标准单位代码
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
    });
  } catch (error) {
    console.error('[search] 搜索出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '搜索失败',
      data: [],
    }, { status: 500 });
  }
}
