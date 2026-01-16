import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const AI_API_URL = process.env.AI_API_URL || 'http://172.31.64.9:8001/v1/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || 'Password@_';
const AI_MODEL = process.env.AI_MODEL || 'qwen3-vl-30b';

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供有效的提案标题',
      }, { status: 400 });
    }

    // 获取实际的提案分类和部门列表
    const [categories, departments] = await Promise.all([
      query<{ tajzlxm: string }>('SELECT tajzlxm FROM tajzlx ORDER BY tajzlxId'),
      query<{ departName: string }>('SELECT departName FROM department ORDER BY departId'),
    ]);

    const categoryList = categories.map(c => c.tajzlxm);
    const departmentList = departments.map(d => d.departName);

    // 调用AI生成提案内容
    const prompt = `你是一个专业的提案写作助手。请根据以下提案标题，生成完整的提案内容。

提案标题：${title}

请按以下要求生成：
1. 提案概述（brief）：50-300字，简要介绍提案内容
2. 情况分析（analysis）：50-300字，分析现状和问题
3. 具体建议（suggest）：30字以上，提出具体的解决建议

提案分类请从以下选项中选择最合适的一个：${categoryList.join('、')}

相关职能部门请从以下选项中选择最合适的1-2个：${departmentList.join('、')}

请严格按照以下JSON格式返回，不要包含任何其他文字：
{
  "brief": "提案概述内容",
  "analysis": "情况分析内容",
  "suggest": "具体建议内容",
  "category": "提案分类",
  "relatedDepartments": "相关职能部门"
}`;

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的提案写作助手。请严格按照JSON格式返回结果。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI AutoFill] AI API error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'AI服务暂时不可用，请稍后重试',
      }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      return NextResponse.json({
        success: false,
        error: 'AI未返回有效内容，请重试',
      }, { status: 500 });
    }

    // 解析JSON
    let result: any;
    try {
      // 尝试提取JSON（可能包含markdown代码块）
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (e) {
      console.error('[AI AutoFill] JSON parse error:', content);
      return NextResponse.json({
        success: false,
        error: 'AI返回内容格式错误，请重试',
      }, { status: 500 });
    }

    // 验证返回的数据
    if (!result.brief || !result.analysis || !result.suggest) {
      return NextResponse.json({
        success: false,
        error: 'AI返回内容不完整，请重试',
      }, { status: 500 });
    }

    // 验证分类是否在列表中
    if (result.category && !categoryList.includes(result.category)) {
      result.category = categoryList[0] || '无所属分类';
    }

    // 验证部门是否在列表中，如果不在则使用第一个
    if (result.relatedDepartments) {
      const validDepts = result.relatedDepartments.split('，')
        .map((d: string) => d.trim())
        .filter((d: string) => departmentList.includes(d));
      if (validDepts.length > 0) {
        result.relatedDepartments = validDepts.join('，');
      } else {
        result.relatedDepartments = departmentList[0] || '后勤保障部';
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[AI AutoFill] Error:', error);
    return NextResponse.json({
      success: false,
      error: '服务异常，请稍后重试',
    }, { status: 500 });
  }
}
