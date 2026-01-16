// AI 服务封装 - 用于提案建议转正式提案功能
// 使用本地 Qwen3-VL-30B 模型（OpenAI 兼容接口）

// 本地 AI Chat API 配置
const AI_CONFIG = {
  apiUrl: process.env.AI_API_URL || 'http://172.31.64.9:8001/v1/chat/completions',
  apiKey: process.env.AI_API_KEY || 'Password@_',
  model: process.env.AI_MODEL || 'qwen3-vl-30b',
  timeout: 120000,
};

// 提案建议数据结构
export interface TajyProposal {
  tajyId: number;
  tajybh: number;
  title: string;
  brief: string;
  context: string;
  analysis: string;
  suggest: string;
  management: string;
  depart: string;
  name: string;
}

// AI 分析结果 - 可合并的提案分组
export interface MergeGroup {
  id: string;
  theme: string;
  proposals: TajyProposal[];
  reason: string;
}

// AI 合并结果
export interface MergeResult {
  title: string;
  reason: string;
  suggest: string;
  management: string;
}

// 调用本地 AI Chat API
async function callAI(prompt: string): Promise<string> {
  if (!AI_CONFIG.apiKey) {
    throw new Error('未配置 AI_API_KEY 环境变量');
  }

  try {
    console.log('[AI Call] 发送请求到本地AI，模型:', AI_CONFIG.model, 'prompt长度:', prompt.length);
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的提案分析助手，负责分析提案建议并将其合并为正式提案。请始终用中文回复，返回格式严格的 JSON。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // 降低随机性，提高结果稳定性
        top_p: 0.7,
        stream: false,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(AI_CONFIG.timeout),
    });

    console.log('[AI Call] 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Call] 本地AI错误响应:', errorText);
      throw new Error(`AI 服务请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('[AI Call] 响应内容长度:', content.length);
    return content;
  } catch (error) {
    console.error('[AI Call] AI 服务调用失败:', error);
    throw error;
  }
}

// 分析提案建议，返回可合并的分组
export async function analyzeProposals(proposals: TajyProposal[]): Promise<MergeGroup[]> {
  if (proposals.length < 2) {
    return [];
  }

  const items = proposals.map((p, i) => {
    return `提案 ${i + 1}：
  - 编号：TY${String(p.tajyId).padStart(4, '0')}
  - 标题：${p.title}
  - 简介：${p.brief || '无'}
  - 部门：${p.depart || '未知'}
  - 提案人：${p.name || '未知'}
  - 内容摘要：${(p.context || '').substring(0, 200)}...`;
  });

  const proposalsText = items.join('\n\n');

  const prompt = `请分析以下提案建议，找出主题相似或可以合并为一组的提案。

${proposalsText}

请直接返回 JSON 格式的分组结果，不要包含任何其他文字说明：
[
  {
    "id": "group-1",
    "theme": "主题描述（如：关于校园食堂管理的建议）",
    "proposalIndices": [0, 2, 3],
    "reason": "合并理由：说明这些提案为什么可以合并"
  }
]

要求：
1. 只将主题真正相似的提案分为一组
2. 每组至少包含 2 个提案
3. 合并后的正式提案应该更有针对性和可操作性
4. proposalIndices 使用 0-based 索引（从0开始）
5. 只返回JSON数组，不要有任何其他文字`;

  try {
    console.log('[AI Analyze] 开始分析提案数量:', proposals.length);
    const response = await callAI(prompt);
    console.log('[AI Analyze] AI 原始响应:', response.substring(0, 500));

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      console.log('[AI Analyze] 提取的JSON:', jsonMatch[0].substring(0, 500));
      const groups = JSON.parse(jsonMatch[0]);
      console.log('[AI Analyze] 解析成功，分组数量:', groups.length);
      return groups.map((g: any) => ({
        id: g.id,
        theme: g.theme,
        proposals: g.proposalIndices.map((idx: number) => proposals[idx]),
        reason: g.reason,
      }));
    }
    console.error('[AI Analyze] 未找到JSON数组');
    return [];
  } catch (error) {
    console.error('[AI Analyze] 解析 AI 响应失败:', error);
    return [];
  }
}

// 合并提案建议为正式提案内容
export async function mergeProposals(proposals: TajyProposal[]): Promise<MergeResult> {
  const items = proposals.map((p, i) => {
    return `提案 ${i + 1}：
  - 标题：${p.title}
  - 简介：${p.brief || '无'}
  - 现状分析：${p.analysis || '无'}
  - 改进建议：${p.suggest || '无'}
  - 职能部门：${p.management || '未指定'}
  - 部门：${p.depart || '未知'}
  - 提案人：${p.name || '未知'}
  - 内容：${p.context || '无'}`;
  });

  const proposalsText = items.join('\n\n===\n\n');

  const prompt = `请将以下 ${proposals.length} 条提案建议合并为一个正式提案。

${proposalsText}

请直接返回 JSON 格式的合并结果，不要包含任何其他文字说明：
{
  "title": "合并后的正式提案标题（应涵盖所有提案的核心内容）",
  "reason": "案由（综合所有提案的理由，说明为什么要立案，包含必要性和紧迫性）",
  "suggest": "建议文本（必须是纯文本字符串，用数字编号列出具体可操作的建议，例如：1. 建议一。2. 建议二。3. 建议三。）",
  "management": "主办部门（根据提案内容合理确定）"
}

重要说明：
1. suggest 字段必须是纯文本字符串，不能是对象或数组
2. 建议用数字编号列出，每条建议简洁明了
3. 只返回JSON对象，不要有任何其他文字

示例格式：
{
  "title": "关于校园环境改善的建议",
  "reason": "当前校园绿化不足、充电桩短缺，影响师生生活质量，亟需改善。",
  "suggest": "1. 加强南校区绿化，提升校园环境质量。2. 恢复部分拆除的充电桩，优先在一期停车场加装10-15个快慢充结合充电桩。3. 将充电桩建设纳入校园基建改造计划，布局集中式充电站。4. 扩大绿化面积，增加植被种类。",
  "management": "后勤处"
}`;

  try {
    console.log('[AI Merge] 开始合并提案数量:', proposals.length);
    const response = await callAI(prompt);
    console.log('[AI Merge] AI 原始响应长度:', response.length);
    console.log('[AI Merge] AI 原始响应前500字符:', response.substring(0, 500));

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('[AI Merge] 提取的JSON长度:', jsonMatch[0].length);
      let parsed = JSON.parse(jsonMatch[0]);

      // 如果 suggest 是对象，转换为文本
      if (parsed.suggest && typeof parsed.suggest === 'object') {
        console.log('[AI Merge] suggest是对象，需要转换:', parsed.suggest);
        parsed.suggest = Object.values(parsed.suggest).join('\n');
      }

      console.log('[AI Merge] 解析结果:', {
        title: parsed.title?.substring(0, 50),
        reasonLength: parsed.reason?.length || 0,
        suggestLength: parsed.suggest?.length || 0,
        suggestPreview: parsed.suggest?.substring(0, 100),
        management: parsed.management,
      });
      return parsed;
    }
    console.error('[AI Merge] 未找到JSON对象');
    throw new Error('无法解析 AI 响应');
  } catch (error) {
    console.error('[AI Merge] 解析 AI 合并结果失败:', error);
    throw error;
  }
}

// 将单个提案建议转换为正式提案
export async function convertToFormalProposal(proposal: TajyProposal): Promise<MergeResult> {
  const proposalText = `提案详情：
  - 标题：${proposal.title}
  - 简介：${proposal.brief || '无'}
  - 现状分析：${proposal.analysis || '无'}
  - 详细内容：${proposal.context || '无'}
  - 改进建议：${proposal.suggest || '无'}
  - 职能部门：${proposal.management || '未指定'}
  - 部门：${proposal.depart || '未知'}
  - 提案人：${proposal.name || '未知'}`;

  const prompt = `请将以下提案建议转换为正式提案格式。

${proposalText}

请直接返回 JSON 格式的转换结果，不要包含任何其他文字说明：
{
  "title": "正式提案标题（精炼、准确，体现核心诉求）",
  "reason": "案由（综合现状分析和理由，说明为什么要立案，包含必要性和紧迫性，逻辑清晰）",
  "suggest": "建议文本（必须是纯文本字符串，用数字编号列出具体可操作的建议，例如：1. 建议一。2. 建议二。3. 建议三。）",
  "management": "主办部门（根据提案内容合理确定）"
}

重要说明：
1. suggest 字段必须是纯文本字符串，不能是对象或数组
2. 建议用数字编号列出，每条建议简洁明了、具有可操作性
3. 案由要充分论证提案的必要性和紧迫性
4. 只返回JSON对象，不要有任何其他文字`;

  try {
    console.log('[AI Convert] 开始转换提案:', proposal.tajyId);
    const response = await callAI(prompt);
    console.log('[AI Convert] AI 原始响应长度:', response.length);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let parsed = JSON.parse(jsonMatch[0]);

      // 如果 suggest 是对象，转换为文本
      if (parsed.suggest && typeof parsed.suggest === 'object') {
        console.log('[AI Convert] suggest是对象，需要转换');
        parsed.suggest = Object.values(parsed.suggest).join('\n');
      }

      console.log('[AI Convert] 转换成功');
      return parsed;
    }
    console.error('[AI Convert] 未找到JSON对象');
    throw new Error('无法解析 AI 响应');
  } catch (error) {
    console.error('[AI Convert] 解析 AI 转换结果失败:', error);
    throw error;
  }
}

// AI 润色结果
export interface PolishResult {
  polished: string;
}

// AI 润色文本
// fieldType: 'brief' | 'analysis' | 'suggest'
export async function polishText(text: string, fieldType: 'brief' | 'analysis' | 'suggest'): Promise<PolishResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('输入内容为空');
  }

  const fieldNames = {
    brief: '提案概述',
    analysis: '情况分析',
    suggest: '具体建议',
  };

  const prompt = `你是一个专业的文本编辑助手。请对以下${fieldNames[fieldType]}进行精细化润色。

**重要原则：**
1. **最小化修改**：只修改真正需要改进的部分
2. **保持原意**：不要改变原文的核心意思
3. **精准修改**：
   - 修正错别字和标点符号错误
   - 优化表达不清晰的句子
   - 调整语序使语句更通顺
   - 替换不恰当的词汇
4. **保留正确**：原文中表达准确的部分保持不变

原始内容：
${text}

请直接返回润色后的文本，不要包含任何其他文字说明或格式标记。

注意：只对需要改进的地方进行修改，保持原文的整体结构和正确表达。`;

  try {
    console.log('[AI Polish] 开始润色字段:', fieldType, '文本长度:', text.length);
    const response = await callAI(prompt);
    console.log('[AI Polish] AI 原始响应:', response);

    // 提取纯文本内容（去除可能的代码块标记）
    let polishedText = response
      .replace(/^```[\s\S]*?\n/, '') // 去除开头的代码块标记
      .replace(/\n```$/, '')          // 去除结尾的代码块标记
      .trim();

    // 如果返回的是 JSON 格式，尝试提取各种可能的字段
    if (polishedText.startsWith('{')) {
      try {
        const parsed = JSON.parse(polishedText);
        // 尝试多种可能的字段名
        polishedText = parsed.polished || parsed.content || parsed.result || parsed.text ||
                       parsed['润色后内容'] || parsed['内容'] || parsed['结果'] ||
                       Object.values(parsed)[0] || polishedText;
        // 确保提取的是字符串
        if (typeof polishedText !== 'string') {
          polishedText = String(polishedText);
        }
      } catch (e) {
        // JSON 解析失败，尝试从响应中提取第一个字符串值
        const match = response.match(/["']([^"']+)["']/);
        if (match) {
          polishedText = match[1];
        }
      }
    }

    // 去除首尾的引号、大括号等无关字符
    polishedText = polishedText
      .replace(/^["'\{\}\[\]]+|["'\{\}\]\]]+$/g, '') // 去除首尾的引号、大括号、中括号
      .trim();

    console.log('[AI Polish] 润色完成，结果:', polishedText);
    return { polished: polishedText };
  } catch (error) {
    console.error('[AI Polish] 润色失败:', error);
    throw error;
  }
}

// 检查本地 AI 服务是否可用
export async function checkAIService(): Promise<{ available: boolean; message: string }> {
  if (!AI_CONFIG.apiKey) {
    return {
      available: false,
      message: '未配置 AI_API_KEY 环境变量',
    };
  }

  try {
    // 发送一个简单的测试请求
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      return {
        available: true,
        message: `本地 AI 服务可用 (模型: ${AI_CONFIG.model})`,
      };
    }

    const errorText = await response.text();
    return {
      available: false,
      message: `本地 AI 服务无法访问: ${response.status}`,
    };
  } catch (error) {
    return {
      available: false,
      message: '本地 AI 服务连接失败',
    };
  }
}
