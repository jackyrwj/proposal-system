// 数据类型定义 - 匹配数据库结构

// 工作动态 News
export interface News {
  newsId: number;
  title: string;
  name: string; // 作者
  context: string; // 内容
  createat: string; // 发布时间
}

// 提案建议 Tajy
export interface Proposal {
  tajyId: number;
  tajybh: number; // 提案编号
  title: string;
  depart: string; // 部门
  name: string; // 提案人
  stuid: string; // 学号/工号
  brief: string; // 简介
  context: string; // 内容
  analysis: string; // 现状分析
  suggest: string; // 改进建议
  management: string; // 职能部门
  attachment: string; // 附件
  type: number; // 类型
  process: number; // 处理状态 0-未审核 1-已立案 2-不立案 3-处理中
  description: string; // 处理描述
  sfnm: number; // 是否匿名
  fyr: string; // 附议人
  mail: string; // 邮箱
  phone: string; // 电话
  clickCount: number; // 点击次数
  createAt: string; // 创建时间
  ownerConfirmed: number; // 提案人是否已确认 0-未确认 1-已确认
  ownerConfirmedAt: string | null; // 提案人确认时间
  isOwner?: boolean; // 当前用户是否是提案人 (API 动态添加)
  reply?: string; // 办理答复 (API 动态添加)
}

// 正式提案 Zsta
export interface FormalProposal {
  zstaId: number;
  zstabh: string; // 正式提案编号
  title: string;
  reason: string; // 案由
  suggest: string; // 建议
  management: string; // 职能部门
  attachment: string; // 附件
  process: number; // 处理状态 0-未处理 1-正在处理 2-处理完毕
  reply: string; // 答复
  clickCount: number; // 点击次数
  createAt: string; // 创建时间
  sourceTajyIds?: string; // 来源提案建议ID列表 (JSON数组)
  allEndorsers?: string; // 所有子提案的附议人并集
}

// 关于提案工作 Gytagz
export interface AboutWork {
  gytagzId: number;
  name: string; // 发布单位
  title: string; // 标题
  context: string; // 内容
  attachment: string; // 附件
  createat: string; // 创建时间
}

// 部门 Department
export interface Department {
  departId: number;
  departName: string;
  account: string;
  description: string;
}

// 提案进展类型 Tajzlx
export interface Tajzlx {
  tajzlxId: number;
  tajzlxm: string; // 提案进展类型名称
  isHidden: number;
}

// 兼容旧的类型定义（用于前端组件）
export interface ProposalDisplay {
  id: number;
  code: string;
  title: string;
  type: string;
  department?: string;
  status: string;
  submitTime: string;
  proposer?: string;
  content?: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 处理状态映射
export const PROCESS_STATUS_MAP: Record<number, string> = {
  1: '待处理',
  2: '已受理',
  3: '办理中',
  4: '已回复',
  5: '已完成',
  6: '已采纳',
};

// 正式提案处理状态映射 (与原系统一致)
export const FORMAL_PROPOSAL_PROCESS_MAP: Record<number, string> = {
  0: '未处理',
  1: '正在处理',
  2: '处理完毕',
};

// 提案建议处理状态映射 (与正式提案不同)
export const PROPOSAL_PROCESS_STATUS_MAP: Record<number, string> = {
  0: '未审核',
  1: '已立案',
  2: '不立案',
  3: '处理中',
};

// 提案类型映射（个人/集体）
export const PROPOSAL_TYPE_MAP: Record<number, string> = {
  1: '个人提案',
  2: '集体提案',
};

// 提案分类映射（校园建设、教学科研等）
export const PROPOSAL_CATEGORY_MAP: Record<number, string> = {
  1: '校园建设',
  2: '教学科研',
  3: '人事制度',
  4: '后勤保障',
  5: '学生管理',
  6: '其他',
};

// 分页参数
export interface PageParams {
  page?: number;
  limit?: number;
  keyword?: string;
}

// 流程节点配置 (用于后台配置)
export interface FlowNodeConfig {
  id: number;
  proposalType: 'tajy' | 'zsta'; // 提案类型
  stepOrder: number; // 步骤顺序
  nodeName: string; // 节点名称
  expectedDays: number; // 预期天数
  description?: string; // 节点描述
  isActive: boolean; // 是否启用
  createdAt: string;
  updatedAt: string;
}

// 提案进度记录
export interface ProposalProgress {
  progressId: number;
  proposalType: 'tajy' | 'zsta';
  proposalId: number; // 提案ID (对应 tajyId 或 zstaId)
  stepId: number; // 当前步骤
  status: 'pending' | 'active' | 'completed';
  completedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// 提案时间线记录
export interface ProposalTimeline {
  timelineId: number;
  proposalType: 'tajy' | 'zsta';
  proposalId: number;
  stepId: number;
  stepName: string;
  action: string; // 操作描述
  operator?: string; // 操作人
  createdAt: string;
}
