import { NextRequest, NextResponse } from 'next/server';
import { query, getChinaTimeString } from '@/lib/db';
import { sendEndorseInvitationNotification } from '@/lib/wework';
import { uploadFile, validateFileType, validateFileSize } from '@/lib/upload';
import path from 'path';

export interface ProposalItem {
  tajyId: number;
  tajybh: number;
  title: string;
  depart: string; // 所属学院/部门
  name: string;
  stuid: string;
  brief: string;
  context: string;
  analysis: string;
  suggest: string;
  management: string;
  attachment: string;
  type: number;
  process: number;
  description: string;
  sfnm: number;
  fyr: string;
  mail: string;
  phone: string;
  clickCount: number;
  createAt: string;
}

// GET /api/proposals - 获取提案建议列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const keyword = searchParams.get('keyword');
    const searchType = searchParams.get('type');
    const process = searchParams.get('process'); // 处理状态筛选
    const month = searchParams.get('month'); // 月份筛选 (YYYY-MM)
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    // 处理搜索条件
    if (keyword) {
      if (searchType === 'title') {
        whereClause = 'WHERE title LIKE ?';
        params.push(`%${keyword}%`);
      } else if (searchType === 'code') {
        whereClause = 'WHERE CAST(tajybh AS CHAR) LIKE ?';
        params.push(`%${keyword}%`);
      } else if (searchType === 'depart') {
        whereClause = 'WHERE depart LIKE ?';
        params.push(`%${keyword}%`);
      }
    }

    // 处理状态筛选
    if (process !== null && process !== '') {
      const processNum = parseInt(process);
      if (!whereClause) {
        whereClause = 'WHERE process = ?';
      } else {
        whereClause += ' AND process = ?';
      }
      params.push(processNum);
    }

    // 处理月份筛选
    if (month) {
      if (!whereClause) {
        whereClause = 'WHERE DATE_FORMAT(createAt, "%Y-%m") = ?';
      } else {
        whereClause += ' AND DATE_FORMAT(createAt, "%Y-%m") = ?';
      }
      params.push(month);
    }

    const proposals = await query<ProposalItem>(`
      SELECT
        tajyId, tajybh, title, depart, name, stuid,
        brief, context, analysis, suggest, management,
        attachment, type, process, description, sfnm,
        fyr, mail, phone, clickCount, createAt
      FROM tajy
      ${whereClause}
      ORDER BY tajyId DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params);

    // 获取总数
    const [countResult] = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM tajy ${whereClause}
    `, params);

    return NextResponse.json({
      success: true,
      data: proposals,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch proposals',
    }, { status: 500 });
  }
}

// POST /api/proposals - 创建新提案建议
export async function POST(request: NextRequest) {
  try {
    // 使用 formData() 解析 multipart/form-data
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const depart = formData.get('depart') as string; // 所属学院/部门
    const relatedDepartments = formData.get('relatedDepartments') as string || null; // 相关职能部门
    const name = formData.get('name') as string;
    const stuid = formData.get('stuid');
    const stuidInt = (stuid && typeof stuid === 'string' && stuid.trim() !== '') ? parseInt(stuid) : null;
    const brief = formData.get('brief') as string;
    const context = formData.get('context') as string;
    const analysis = formData.get('analysis') as string;
    const suggest = formData.get('suggest') as string;
    const mail = formData.get('mail') as string;
    const phone = formData.get('phone') as string;
    const type = parseInt(formData.get('type') as string) || 1;
    const fyr = formData.get('fyr') as string || '';
    const attachment = formData.get('attachment') as File | null;

    // 处理附件上传
    let attachmentPath: string | null = null;
    if (attachment && attachment.size > 0) {
      // 验证文件类型
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip', '.rar'];
      if (!validateFileType(attachment.name, allowedExtensions)) {
        return NextResponse.json({
          success: false,
          error: `不支持的文件类型。仅支持: ${allowedExtensions.join(', ')}`,
        }, { status: 400 });
      }

      // 验证文件大小 (10MB)
      if (!validateFileSize(attachment, 10)) {
        return NextResponse.json({
          success: false,
          error: '文件大小不能超过 10MB',
        }, { status: 400 });
      }

      // 上传文件
      try {
        attachmentPath = await uploadFile(attachment);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return NextResponse.json({
          success: false,
          error: '文件上传失败，请重试',
        }, { status: 500 });
      }
    }

    // 获取最新的提案编号
    const [latest] = await query<{ tajybh: number }[]>(`
      SELECT tajybh FROM tajy ORDER BY tajybh DESC LIMIT 1
    `);
    const newCode = (latest?.[0]?.tajybh || 0) + 1;

    // 插入新提案（fyr 字段为空，等待附议人确认后添加）
    const result = await query<any>(`
      INSERT INTO tajy (
        tajybh, title, depart, name, stuid,
        brief, context, analysis, suggest,
        mail, phone, type, fyr, management, process, createAt, attachment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 0, ?, ?)
    `, [newCode, title, depart, name, stuidInt, brief, context, analysis, suggest, mail, phone, type, relatedDepartments, getChinaTimeString(), attachmentPath]);

    const insertId = (result as any).insertId;

    // 发送企业微信通知和站内信（异步，不阻塞响应）
    // 通知附议人：从 fyr 字段解析附议人的 id，查询对应的 stuid
    if (fyr) {
      console.log('[Proposal Submit] fyr (附议人):', fyr);

      // 解析 fyr 字段，格式如："张三(000217)，李四(000330)"
      const idMatches = fyr.match(/\(([^)]+)\)/g) || []; // 提取括号内的 id
      const endorserIds = idMatches.map(match => match.replace(/[()]/g, '')).filter(id => id);
      console.log('[Proposal Submit] 解析出的附议人 IDs:', endorserIds);

      if (endorserIds.length > 0) {
        // 查询附议人的真实学号（stuid）
        const endorsers = await query<{ stuid: string }[]>(`
          SELECT stuid FROM jdhmd WHERE id IN (${endorserIds.map(() => '?').join(',')})
        `, endorserIds);

        const stuids = endorsers.map((e: any) => e.stuid).filter((s: string | undefined) => s);
        console.log('[Proposal Submit] 查询到的附议人学号 stuids:', stuids);

        if (stuids.length > 0) {
          // 构建附议页面链接
          const endorseUrl = `http://172.31.171.244:3000/proposals/${insertId}`;

          // 发送附议邀请通知（企微 + 站内信，异步不阻塞响应）
          sendEndorseInvitationNotification(stuids, endorserIds, name, title, insertId, endorseUrl).catch(err => {
            console.error('Failed to send endorsement invitation:', err);
          });

          // 插入待确认的附议记录到 proposal_endorsements 表
          (async () => {
            try {
              const values = endorserIds.map(() => '(?, ?, ?)').join(', ');
              const params = endorserIds.flatMap((id: string) => [
                insertId,
                id,
                'pending',
              ]);

              await query(`
                INSERT INTO proposal_endorsements (proposalId, endorserId, status)
                VALUES ${values}
              `, params);
              console.log('[Proposal Submit] 附议邀请记录创建成功');
            } catch (err) {
              console.error('[Proposal Submit] 附议邀请记录创建失败:', err);
            }
          })();
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (result as any).insertId,
        code: newCode,
      },
    });
  } catch (error: any) {
    console.error('Error creating proposal:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create proposal',
      message: error.message,
    }, { status: 500 });
  }
}
