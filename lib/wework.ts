// 企业微信消息通知工具

import { query } from './db';

const WEWORK_BASE_URL = 'http://210.39.8.33:4024/cgi-bin';

interface WeworkConfig {
  corpid: string;
  corpsecret: string;
  agentId: string;
}

const config: WeworkConfig = {
  corpid: '1000237',
  corpsecret: 'Zdj1CTkWnQML13xMM4NwSu2e5Pe_Kh-2rUpiW_UrK7oDG99ZczrgdZx86xPbbH9g',
  agentId: '1000237',
};

// 企微模板ID配置
export const TEMPLATE_IDS = {
  ENDORSE_INVITATION: 'CVGH39SVYC',  // 附议邀请
  PROCESS_NOTIFICATION: 'CVGH7DPC6C', // 审批进度
} as const;

// 站内信类型配置（与企微消息同步）
export const MESSAGE_TYPES = {
  ENDORSE_INVITATION: 1,  // 附议邀请
  PROCESS_NOTIFICATION: 2, // 审批进度
} as const;

// 缓存 access_token，避免频繁请求
let tokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * 保存消息记录到数据库
 */
async function saveMessage(
  studentID: string,
  templateId: string,
  parameters: string[],
  msgid: string,
  success: boolean,
  error: string = ''
): Promise<void> {
  try {
    await query(`
      INSERT INTO wework_messages (studentID, templateId, Parameters, msgid, success, error)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [studentID, templateId, JSON.stringify(parameters), msgid, success ? 1 : 0, error]);
    console.log('[WeWork] 消息记录已保存');
  } catch (err) {
    console.error('[WeWork] 保存消息记录失败:', err);
  }
}

/**
 * 获取企业微信 access_token
 */
export async function getAccessToken(): Promise<string> {
  // 检查缓存是否有效
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    console.log('[WeWork] 使用缓存的 token');
    return tokenCache.token;
  }

  const url = `${WEWORK_BASE_URL}/gettoken?corpid=${config.corpid}&corpsecret=${config.corpsecret}`;
  console.log('[WeWork] 请求 access_token, URL:', url);

  try {
    const response = await fetch(url);
    console.log('[WeWork] token 响应状态:', response.status);

    const result = await response.json() as {
      errcode: number;
      errmsg: string;
      access_token?: string;
      expires_in?: number;
    };

    console.log('[WeWork] token 响应结果:', JSON.stringify(result));

    if (result.errcode === 0 && result.access_token) {
      // 缓存 token，提前 5 分钟过期
      const expiresIn = (result.expires_in || 7200) - 300;
      tokenCache = {
        token: result.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      console.log('[WeWork] token 获取成功, 缓存到:', new Date(tokenCache.expiresAt).toLocaleString());
      return result.access_token;
    }

    throw new Error(`获取 access_token 失败: ${result.errmsg} (${result.errcode})`);
  } catch (error) {
    console.error('[WeWork] 获取 token 异常:', error);
    throw error;
  }
}

/**
 * 发送企业微信模板消息
 * @param templateId 模板ID
 * @param studentIDs 学号列表
 * @param parameters 模板参数
 */
export async function sendTemplateMessage(
  templateId: string,
  studentIDs: string[],
  parameters: string[]
): Promise<{ success: boolean; msgid?: string; error?: string }> {
  console.log('[WeWork] 开始发送消息');
  console.log('[WeWork] templateId:', templateId);
  console.log('[WeWork] studentIDs:', studentIDs);
  console.log('[WeWork] parameters:', parameters);

  // 确保 studentID 是字符串数组
  const stringStudentIDs = studentIDs.map(id => String(id).trim());

  let msgid = '';
  let errorMsg = '';
  let success = false;

  try {
    const token = await getAccessToken();
    const url = `${WEWORK_BASE_URL}/message/send?access_token=${token}`;

    const payload = {
      templateId: templateId,
      studentID: stringStudentIDs,
      Parameters: parameters,
      AgentId: config.agentId,
    };

    console.log('[WeWork] 发送请求, URL:', url);
    console.log('[WeWork] 请求体:', JSON.stringify(payload));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json() as {
      errcode: number;
      errmsg: string;
      msgid?: string;
    };

    console.log('[WeWork] 响应结果:', JSON.stringify(result));

    if (result.errcode === 0) {
      msgid = result.msgid || '';
      success = true;
      console.log('[WeWork] 消息发送成功, msgid:', msgid);
    } else {
      errorMsg = `发送失败: ${result.errmsg} (${result.errcode})`;
      console.error('[WeWork] 消息发送失败:', result.errmsg, 'errcode:', result.errcode);
    }
  } catch (error) {
    errorMsg = error instanceof Error ? error.message : '未知错误';
    console.error('[WeWork] 发送消息异常:', error);
  }

  // 保存消息记录
  for (const studentID of stringStudentIDs) {
    await saveMessage(studentID, templateId, parameters, msgid, success, errorMsg);
  }

  return {
    success,
    msgid,
    error: errorMsg || undefined,
  };
}

/**
 * 发送附议邀请通知（企微 + 站内信）
 * 模板：【附议邀请】{1}邀请您附议提案《{2}》，点击<a href="{3}">立即附议</a>
 * @param studentID 被邀请人的学号或学号数组
 * @param cardId 被邀请人的cardId或cardId数组（用于站内信）
 * @param inviterName 邀请人姓名
 * @param proposalTitle 提案标题
 * @param proposalId 提案ID
 * @param endorseUrl 附议页面链接
 */
export async function sendEndorseInvitationNotification(
  studentID: string | string[],
  cardId: string | string[],
  inviterName: string,
  proposalTitle: string,
  proposalId: number,
  endorseUrl: string
): Promise<{ wework: { success: boolean; msgid?: string; error?: string }; message: boolean }> {
  const studentIDs = Array.isArray(studentID) ? studentID : [studentID];
  const cardIds = Array.isArray(cardId) ? cardId : [cardId];

  // 企微参数：{1}=邀请人姓名, {2}=提案标题, {3}=附议链接
  const weworkParams = [inviterName, proposalTitle, endorseUrl];
  const weworkResult = await sendTemplateMessage(
    TEMPLATE_IDS.ENDORSE_INVITATION,
    studentIDs,
    weworkParams
  );

  // 站内信内容（与企微同步）
  let messageSuccess = true;
  try {
    const { getChinaTimeString } = await import('./db');
    const timeStr = getChinaTimeString();

    const messageContext = {
      type: 'endorse_invitation',
      title: `${inviterName}邀请您附议提案`,
      content: `${inviterName}邀请您附议提案《${proposalTitle}》，请点击链接进行附议。`,
      proposalId: proposalId,
      proposalTitle: proposalTitle,
      inviterName: inviterName,
      endorseUrl: endorseUrl,
    };

    const values = cardIds.flatMap((id) => [
      id,
      MESSAGE_TYPES.ENDORSE_INVITATION,
      JSON.stringify(messageContext),
      0, // hasRead = 0 未读
      timeStr,
    ]);

    await query(`
      INSERT INTO message (cardId, informType, context, hasRead, time)
      VALUES ${cardIds.map(() => '(?, ?, ?, ?, ?)').join(', ')}
    `, values);

    console.log('[Message] 附议邀请站内信发送成功');
  } catch (err) {
    console.error('[Message] 附议邀请站内信发送失败:', err);
    messageSuccess = false;
  }

  return {
    wework: weworkResult,
    message: messageSuccess,
  };
}

/**
 * 发送提案审批进度通知（企微 + 站内信）
 * 模板：【提案进度】您的提案《{1}》{2}，点击<a href="{3}">查看详情</a>
 * @param studentID 提案人学号
 * @param cardId 提案人cardId（用于站内信）
 * @param proposalTitle 提案标题
 * @param processStatus 审批状态（如：已立案、正在处理、处理完毕、已回复）
 * @param proposalUrl 提案详情链接
 * @param replyData 回复数据（可选，用于回复通知）
 */
export async function sendProposalProcessNotification(
  studentID: string | string[],
  cardId: string,
  proposalTitle: string,
  processStatus: string,
  proposalUrl: string,
  replyData?: {
    replyDepartment: string;
    handleOpinion: string;
    detailReply: string;
    departmentName: string;
  }
): Promise<{ wework: { success: boolean; msgid?: string; error?: string }; message: boolean }> {
  const studentIDs = Array.isArray(studentID) ? studentID : [studentID];

  // 企微参数：{1}=提案标题, {2}=审批状态, {3}=详情链接
  const weworkParams = [proposalTitle, processStatus, proposalUrl];
  const weworkResult = await sendTemplateMessage(
    TEMPLATE_IDS.PROCESS_NOTIFICATION,
    studentIDs,
    weworkParams
  );

  // 站内信内容（与企微同步）
  let messageSuccess = true;
  try {
    const { getChinaTimeString } = await import('./db');
    const timeStr = getChinaTimeString();

    let messageContext;

    if (replyData) {
      // 回复通知
      messageContext = {
        type: 'proposal_reply',
        title: `关于您的提案《${proposalTitle}》的回复`,
        content: `您的提案《${proposalTitle}》已收到${replyData.replyDepartment}的回复，请查看详情。`,
        proposalId: 0, // 从 proposalUrl 中解析
        proposalTitle: proposalTitle,
        processStatus: processStatus,
        proposalUrl: proposalUrl,
        replyDepartment: replyData.replyDepartment,
        handleOpinion: replyData.handleOpinion,
        detailReply: replyData.detailReply,
        departmentName: replyData.departmentName,
      };
    } else {
      // 审批进度通知
      messageContext = {
        type: 'proposal_process',
        title: `您的提案${processStatus}`,
        content: `您的提案《${proposalTitle}》${processStatus}，请查看详情。`,
        proposalId: 0, // 从 proposalUrl 中解析
        proposalTitle: proposalTitle,
        processStatus: processStatus,
        proposalUrl: proposalUrl,
      };
    }

    await query(`
      INSERT INTO message (cardId, informType, context, hasRead, time)
      VALUES (?, ?, ?, ?, ?)
    `, [cardId, MESSAGE_TYPES.PROCESS_NOTIFICATION, JSON.stringify(messageContext), 0, timeStr]);

    console.log('[Message] 审批进度站内信发送成功');
  } catch (err) {
    console.error('[Message] 审批进度站内信发送失败:', err);
    messageSuccess = false;
  }

  return {
    wework: weworkResult,
    message: messageSuccess,
  };
}

/**
 * 获取审批状态文本
 * @param process 状态值：0=未处理, 1=已立案, 2=处理完毕
 */
export function getProcessStatusText(process: number): string {
  const statusMap: Record<number, string> = {
    0: '未处理',
    1: '已立案',
    2: '处理完毕',
  };
  return statusMap[process] || '状态已更新';
}
