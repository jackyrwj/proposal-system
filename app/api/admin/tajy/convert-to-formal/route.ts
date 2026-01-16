import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';
import { convertToFormalProposal } from '@/lib/ai';

// 从请求中获取用户信息
function getUserFromRequest(request: NextRequest): { id: string; name: string; type: string } | null {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(c => c.trim());
    const userCookie = cookies.find(c => c.startsWith('user='));
    if (!userCookie) return null;

    const userStr = decodeURIComponent(userCookie.split('=')[1]);
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// 转换结果接口
interface ConvertResult {
  title: string;
  reason: string;
  suggest: string;
  management: string;
}

// POST /api/admin/tajy/convert-to-formal - AI转换提案建议为正式提案
export async function POST(request: NextRequest) {
  try {
    // 检查用户权限
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '请先登录',
      }, { status: 401 });
    }

    const body = await request.json();
    const { tajyId, convertResult, previewOnly = false } = body;

    if (!tajyId) {
      return NextResponse.json({
        success: false,
        error: '提案ID不能为空',
      }, { status: 400 });
    }

    // 查询提案信息
    const proposals = await query<{
      tajyId: number;
      title: string;
      brief: string;
      context: string;
      analysis: string;
      suggest: string;
      management: string;
      depart: string;
      name: string;
      description: string;
      fyr: string;
    }>(`
      SELECT tajyId, title, brief, context, analysis, suggest, management, depart, name, description, fyr
      FROM tajy WHERE tajyId = ?
    `, [tajyId]);

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({
        success: false,
        error: '提案不存在',
      }, { status: 404 });
    }

    const proposal = proposals[0];

    // 检查是否已转换为正式提案
    if (proposal.description && proposal.description.includes('已转换为正式提案:')) {
      return NextResponse.json({
        success: false,
        error: '该提案已转换为正式提案',
      }, { status: 400 });
    }

    // 检查是否为子提案（被AI合并生成的提案包含的来源提案）
    if (proposal.description && proposal.description.startsWith('AI合并来源:')) {
      return NextResponse.json({
        success: false,
        error: '子提案不能直接转换为正式提案，请通过合并后的主提案进行转换',
      }, { status: 400 });
    }

    // 如果是预览模式或已提供转换结果，直接返回
    if (previewOnly && convertResult) {
      return NextResponse.json({
        success: true,
        data: convertResult,
      });
    }

    // 如果没有提供转换结果，调用AI进行转换
    let result: ConvertResult;
    if (convertResult) {
      result = convertResult;
    } else {
      try {
        result = await convertToFormalProposal(proposal as any);
      } catch (error) {
        console.error('AI conversion error:', error);
        return NextResponse.json({
          success: false,
          error: 'AI 转换失败，请检查 AI 服务是否正常运行',
        }, { status: 500 });
      }
    }

    // 如果是预览模式，只返回转换结果
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // 正式提交：创建正式提案记录
    const insertResult = await query<{ insertId: number }[]>(`
      INSERT INTO zsta (zstabh, title, reason, suggest, management, process, createAt, sourceTajyIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['', result.title, result.reason || '', result.suggest || '', result.management || '', 0, getChinaTimeString(), JSON.stringify([tajyId])]);

    const zstaId = (insertResult as any).insertId;

    // 生成正式提案编号：年份 + ZSTA + zstaId (3位)
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const year = chinaTime.getFullYear();
    const zstabh = `${year}ZSTA${String(zstaId).padStart(3, '0')}`;

    // 更新 zstabh 并记录来源
    await query(`
      UPDATE zsta SET zstabh = ? WHERE zstaId = ?
    `, [zstabh, zstaId]);

    // 更新原提案的 description，标记已转换
    const currentDescription = proposal.description || '';
    const conversionNote = `已转换为正式提案:${zstaId}`;
    const updatedDescription = currentDescription
      ? `${currentDescription}\n${conversionNote}`
      : conversionNote;

    await query(`
      UPDATE tajy SET description = ? WHERE tajyId = ?
    `, [updatedDescription, tajyId]);

    return NextResponse.json({
      success: true,
      data: {
        zstaId,
        zstabh,
        tajyId,
      },
      message: '转换成功',
    });
  } catch (error) {
    console.error('Error converting proposal:', error);
    return NextResponse.json({
      success: false,
      error: '转换失败',
    }, { status: 500 });
  }
}
