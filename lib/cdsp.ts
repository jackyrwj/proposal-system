// CDSP API 配置和签名工具
// 注意：敏感信息从环境变量读取，不要直接写入代码
const CDSP_CONFIG = {
  appId: process.env.CDSP_APP_ID || '',
  appSecret: process.env.CDSP_APP_SECRET || '',
  baseUrl: 'https://cdsp.szu.edu.cn/cdsp/data-api/v2',
};

/**
 * 生成 CDSP API 请求签名
 * 签名逻辑: md5(appId + appSecret + timestamp) -> base64
 */
export async function generateSign(): Promise<{ sign: string; timestamp: string }> {
  const timestamp = String(Date.now());
  const plainText = CDSP_CONFIG.appId + CDSP_CONFIG.appSecret + timestamp;

  // 使用 Node.js crypto 模块的 MD5
  const crypto = await import('crypto');
  const md5Hash = crypto.createHash('md5').update(plainText).digest('hex');

  // Base64 encode
  const sign = Buffer.from(md5Hash).toString('base64');

  return { sign, timestamp };
}

/**
 * 生成 CDSP API 请求头
 */
export async function getCdspHeaders(): Promise<HeadersInit> {
  const { sign, timestamp } = await generateSign();

  return {
    'appId': CDSP_CONFIG.appId,
    'Content-Type': 'application/json',
    'timestamp': timestamp,
    'sign': sign,
  };
}

/**
 * 教职工人员信息接口返回类型
 */
export interface TeacherInfo {
  '校园卡号'?: string;     // 校园卡号
  'XYH'?: string;          // 校园卡号（也可能是XYH格式）
  '职工号'?: string;       // 职工号
  '姓名'?: string;         // 姓名
  '标准单位代码'?: string;  // 标准单位代码
  '标准单位名称'?: string;  // 标准单位名称
}

/**
 * 从 CDSP API 搜索教职工人员
 * @param keyword 搜索关键词（校园卡号、姓名、所在单位名称、职工号）
 * @returns 匹配的人员列表
 */
export async function searchTeacher(keyword: string): Promise<TeacherInfo[]> {
  if (!keyword || keyword.trim().length < 1) {
    return [];
  }

  try {
    // 搜索接口使用特定的 appId 和 appSecret
    const SEARCH_APP_ID = '2013533628873015298';
    const SEARCH_APP_SECRET = '699733041e0f4da3aff500e0cde0c536';

    // 生成签名
    const timestamp = String(Date.now());
    const plainText = SEARCH_APP_ID + SEARCH_APP_SECRET + timestamp;
    const crypto = await import('crypto');
    const md5Hash = crypto.createHash('md5').update(plainText).digest('hex');
    const sign = Buffer.from(md5Hash).toString('base64');

    const headers = {
      'appId': SEARCH_APP_ID,
      'Content-Type': 'application/json',
      'timestamp': timestamp,
      'sign': sign,
    };

    const trimmedKeyword = keyword.trim();

    // 使用中文字段名构建 OData filter
    const filters = [
      `contains(姓名,'${trimmedKeyword}')`,      // 姓名模糊匹配
      `职工号 eq '${trimmedKeyword}'`,            // 职工号精确匹配
      `校园卡号 eq '${trimmedKeyword}'`,          // 校园卡号精确匹配
      `contains(标准单位名称,'${trimmedKeyword}')`, // 单位名称模糊匹配
    ];
    const filterParam = filters.join(' or ');

    const fullUrl = `${CDSP_CONFIG.baseUrl}/JZG0001?$filter=${encodeURIComponent(filterParam)}`;

    console.log('[CDSP] 搜索请求 URL:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    console.log('[CDSP] API 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CDSP] API error response:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('[CDSP] API 返回数据:', JSON.stringify(data).substring(0, 500));
    return (data.value || []) as TeacherInfo[];
  } catch (error) {
    console.error('[CDSP] Search teacher error:', error);
    return [];
  }
}

/**
 * 根据校园卡号获取单个教职工信息
 * @param cardNo 校园卡号
 * @returns 教职工信息或 null
 */
export async function getTeacherByCardNo(cardNo: string): Promise<TeacherInfo | null> {
  const results = await searchTeacher(cardNo);
  // 精确匹配校园卡号
  const exactMatch = results.find(t => t.XYH === cardNo);
  return exactMatch || results[0] || null;
}

/**
 * 部门信息接口返回类型
 */
export interface DepartmentInfo {
  '代码'?: string;      // 部门代码
  '名称'?: string;      // 部门名称
  '英文名称'?: string;  // 英文名称
  '简称'?: string;      // 简称
  '层次'?: string;      // 层级
  '隶属'?: string;      // 上级部门代码
  '类别代码'?: string;  // 类别代码
  '部门类别'?: string;  // 部门类别
  '是否使用'?: string;  // 是否使用
  '数据更新时间'?: string; // 数据更新时间
}

/**
 * 生成指定 appId 的请求头（用于需要不同凭证的接口）
 */
async function getCdspHeadersForApp(appId: string, appSecret: string): Promise<HeadersInit> {
  const timestamp = String(Date.now());
  const plainText = appId + appSecret + timestamp;

  const crypto = await import('crypto');
  const md5Hash = crypto.createHash('md5').update(plainText).digest('hex');
  const sign = Buffer.from(md5Hash).toString('base64');

  return {
    'appId': appId,
    'Content-Type': 'application/json',
    'timestamp': timestamp,
    'sign': sign,
  };
}

/**
 * 从 CDSP API 获取所有部门信息
 * GG0002 接口需要使用旧的 APP_ID
 */
export async function fetchDepartments(): Promise<DepartmentInfo[]> {
  // GG0002 使用旧的凭证
  const OLD_APP_ID = process.env.CDSP_OLD_APP_ID || '1963446784588480514';
  const OLD_APP_SECRET = process.env.CDSP_OLD_APP_SECRET || 'e4769d543a154c038ca0c08697fe7b01';

  try {
    const headers = await getCdspHeadersForApp(OLD_APP_ID, OLD_APP_SECRET);
    const url = `${CDSP_CONFIG.baseUrl}/GG0002`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[CDSP] GG0002 API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.value || []) as DepartmentInfo[];
  } catch (error) {
    console.error('[CDSP] Fetch departments error:', error);
    return [];
  }
}

/**
 * 单位信息接口返回类型 (GG0008)
 */
export interface UnitInfo {
  'WID'?: string;              // 唯一标识
  '单位代码'?: string;          // 单位代码
  '单位名称'?: string;          // 单位名称
  '隶属单位代码'?: string;      // 隶属单位代码
  '单位层次'?: number;          // 单位层次
  '单位类别代码'?: string;      // 单位类别代码
  '单位类别'?: string;          // 单位类别
  '排序'?: number;              // 排序
  '是否使用'?: string;          // 是否使用
  '创建日期'?: string;          // 创建日期
}

/**
 * 从 CDSP API 获取所有单位信息 (GG0008)
 * GG0008 返回更详细的单位/部门信息
 * 只获取单位层次为2的记录（即职能部门）
 */
export async function fetchUnitsFromGG0008(): Promise<UnitInfo[]> {
  // GG0008 使用旧的凭证
  const OLD_APP_ID = process.env.CDSP_OLD_APP_ID || '1963446784588480514';
  const OLD_APP_SECRET = process.env.CDSP_OLD_APP_SECRET || 'e4769d543a154c038ca0c08697fe7b01';

  try {
    const headers = await getCdspHeadersForApp(OLD_APP_ID, OLD_APP_SECRET);
    // 添加过滤条件：单位层次 eq 2（职能部门）
    const url = `${CDSP_CONFIG.baseUrl}/GG0008?$filter=单位层次 eq 2`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[CDSP] GG0008 API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.value || []) as UnitInfo[];
  } catch (error) {
    console.error('[CDSP] Fetch units error:', error);
    return [];
  }
}
