// RAG (Retrieval-Augmented Generation) 工具
// 支持使用智谱 AI Embedding API 实现语义搜索（可选）
// 注意：当前本地 qwen3-vl-30b 模型不支持 embedding API

import * as fs from 'fs';
import * as path from 'path';

// Embedding API 配置（使用智谱 AI 作为备用）
const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL || 'https://open.bigmodel.cn/api/paas/v4/embeddings';
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || process.env.ZHIPU_API_KEY || '';
const EMBEDDING_ENABLED = process.env.EMBEDDING_ENABLED !== 'false'; // 默认启用，配置为false时禁用

// 缓存文件路径
const CACHE_DIR = path.join(process.cwd(), 'data');
const EMBEDDINGS_CACHE_FILE = path.join(CACHE_DIR, 'proposal-embeddings.json');

// 确保缓存目录存在
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// 向量缓存接口
interface EmbeddingCache {
  [key: string]: {  // key 格式: "proposalType_id" 如 "tajy_123", "zsta_456"
    proposalType: string;  // 'tajy' 或 'zsta'
    tajyId: number;
    tajybh: number;
    title: string;
    brief: string;
    embedding: number[];
    updatedAt: string;
  };
}

// 生成缓存 key
function getCacheKey(proposalType: string, tajyId: number): string {
  return `${proposalType}_${tajyId}`;
}

// 加载缓存
function loadCache(): EmbeddingCache {
  try {
    ensureCacheDir();
    if (fs.existsSync(EMBEDDINGS_CACHE_FILE)) {
      const data = fs.readFileSync(EMBEDDINGS_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('加载缓存失败:', error);
  }
  return {};
}

// 保存缓存
function saveCache(cache: EmbeddingCache) {
  try {
    ensureCacheDir();
    fs.writeFileSync(EMBEDDINGS_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

// 获取 JWT Token（智谱 API 需要使用 JWT 认证）
function generateToken(apiKey: string): string {
  try {
    const [id, secret] = apiKey.split('.');
    if (!id || !secret) {
      throw new Error('无效的 API Key 格式');
    }

    // 简化版：直接使用 API Key
    // 智谱的新 API 支持直接使用 Bearer Token
    return apiKey;
  } catch (error) {
    console.error('生成 Token 失败:', error);
    return apiKey;
  }
}

// 调用 Embedding API
export async function getEmbedding(text: string): Promise<number[]> {
  console.log('[RAG Embedding] 开始获取 embedding，文本长度:', text.length);

  if (!EMBEDDING_ENABLED) {
    throw new Error('Embedding 功能已禁用 (EMBEDDING_ENABLED=false)');
  }

  if (!EMBEDDING_API_KEY) {
    throw new Error('未配置 EMBEDDING_API_KEY 或 ZHIPU_API_KEY 环境变量');
  }

  try {
    const startTime = Date.now();
    const response = await fetch(EMBEDDING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'embedding-3', // 智谱的 embedding 模型
        input: text,
        encoding_format: 'float',
      }),
    });

    console.log('[RAG Embedding] API 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[RAG Embedding] Embedding API 错误响应:', errorText);
      throw new Error(`Embedding API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[RAG Embedding] API 返回数据结构:', JSON.stringify({ ...data, data: data.data?.length ? `[${data.data[0].embedding.length} dimensions]` : 'no data' }).substring(0, 200));

    if (data.data && data.data.length > 0) {
      const elapsed = Date.now() - startTime;
      console.log('[RAG Embedding] 获取成功，耗时:', elapsed, 'ms，向量维度:', data.data[0].embedding.length);
      return data.data[0].embedding;
    }

    throw new Error('未返回 embedding 数据');
  } catch (error) {
    console.error('[RAG Embedding] 获取 Embedding 失败:', error);
    throw error;
  }
}

// 检查 Embedding 服务是否可用
export async function checkEmbeddingService(): Promise<{ available: boolean; message: string }> {
  if (!EMBEDDING_ENABLED) {
    return {
      available: false,
      message: 'Embedding 功能已禁用 (EMBEDDING_ENABLED=false)',
    };
  }

  if (!EMBEDDING_API_KEY) {
    return {
      available: false,
      message: '未配置 EMBEDDING_API_KEY 或 ZHIPU_API_KEY 环境变量',
    };
  }

  try {
    const response = await fetch(EMBEDDING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'embedding-3',
        input: 'test',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return {
        available: true,
        message: `Embedding 服务可用 (${EMBEDDING_API_URL})`,
      };
    }

    return {
      available: false,
      message: `Embedding 服务无法访问: ${response.status}`,
    };
  } catch (error) {
    return {
      available: false,
      message: 'Embedding 服务连接失败',
    };
  }
}

// 计算余弦相似度
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('向量长度不一致');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 批量获取 Embedding（带缓存）
export async function getProposalsEmbeddings(proposals: any[]): Promise<Map<string, number[]>> {
  console.log('[RAG Cache] 开始获取提案 embeddings，提案数量:', proposals.length);

  const cache = loadCache();
  const embeddings = new Map<string, number[]>();  // key: "proposalType_id"
  const needsFetch: any[] = [];

  // 检查缓存
  for (const proposal of proposals) {
    const proposalType = proposal.proposalType || 'tajy';
    const cacheKey = getCacheKey(proposalType, proposal.tajyId);
    const cached = cache[cacheKey];

    if (cached && cached.title === proposal.title && cached.brief === (proposal.brief || '')) {
      embeddings.set(cacheKey, cached.embedding);
    } else {
      needsFetch.push(proposal);
    }
  }

  console.log('[RAG Cache] 缓存命中:', embeddings.size, '需要新获取:', needsFetch.length);

  // 批量获取新的 embedding
  for (const proposal of needsFetch) {
    try {
      const proposalType = proposal.proposalType || 'tajy';
      const cacheKey = getCacheKey(proposalType, proposal.tajyId);

      // 组合标题和简述作为搜索文本
      const searchText = `${proposal.title}\n${proposal.brief || ''}`;
      console.log('[RAG Cache] 获取提案 embedding:', cacheKey, '文本长度:', searchText.length);

      const embedding = await getEmbedding(searchText);

      embeddings.set(cacheKey, embedding);

      // 更新缓存
      cache[cacheKey] = {
        proposalType,
        tajyId: proposal.tajyId,
        tajybh: proposal.tajybh,
        title: proposal.title,
        brief: proposal.brief || '',
        embedding,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[RAG Cache] 获取提案 ${proposal.tajyId} 的 embedding 失败:`, error);
    }
  }

  // 保存缓存
  if (needsFetch.length > 0) {
    console.log('[RAG Cache] 保存缓存...');
    saveCache(cache);
    console.log('[RAG Cache] 缓存已保存');
  }

  return embeddings;
}

// 语义搜索
export interface SearchResult {
  proposalType: string;  // 'tajy' 提案建议 或 'zsta' 正式提案
  tajyId: number;
  tajybh: number;
  title: string;
  brief?: string;
  context?: string;
  analysis?: string;
  suggest?: string;
  createAt: string;
  similarity: number;
}

export async function semanticSearch(
  queryText: string,
  proposals: any[],
  limit: number = 10
): Promise<SearchResult[]> {
  // 1. 获取查询文本的 embedding
  const queryEmbedding = await getEmbedding(queryText);

  // 2. 获取所有提案的 embedding（带缓存）
  const embeddings = await getProposalsEmbeddings(proposals);

  // 3. 计算相似度并排序
  const results: SearchResult[] = [];

  for (const proposal of proposals) {
    const proposalType = proposal.proposalType || 'tajy';
    const cacheKey = getCacheKey(proposalType, proposal.tajyId);
    const embedding = embeddings.get(cacheKey);

    if (embedding) {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      results.push({
        proposalType,
        tajyId: proposal.tajyId,
        tajybh: proposal.tajybh,
        title: proposal.title,
        brief: proposal.brief,
        context: proposal.context,
        analysis: proposal.analysis,
        suggest: proposal.suggest,
        createAt: proposal.createAt,
        similarity,
      });
    }
  }

  // 4. 按相似度排序并返回前 N 条
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

// 清除缓存（用于重新生成）
export function clearEmbeddingCache(): void {
  try {
    if (fs.existsSync(EMBEDDINGS_CACHE_FILE)) {
      fs.unlinkSync(EMBEDDINGS_CACHE_FILE);
    }
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
}

// 获取缓存统计
export function getCacheStats(): { count: number; size: string } {
  try {
    const cache = loadCache();
    const size = fs.existsSync(EMBEDDINGS_CACHE_FILE)
      ? `${(fs.statSync(EMBEDDINGS_CACHE_FILE).size / 1024).toFixed(2)} KB`
      : '0 KB';
    return { count: Object.keys(cache).length, size };
  } catch (error) {
    return { count: 0, size: '0 KB' };
  }
}
