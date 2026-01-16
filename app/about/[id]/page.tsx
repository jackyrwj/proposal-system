'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, FileText, ArrowLeft, Home, Loader2, Download, BookOpen, Printer } from 'lucide-react';
import { AboutWork } from '@/types';

export default function AboutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<AboutWork | null>(null);
  const [loading, setLoading] = useState(true);

  // 默认内容（当数据库中没有数据时显示）
  const defaultContents: Record<number, { title: string; content: string }> = {
    1: {
      title: '教代会提案工作办法',
      content: `第一章 总则

第一条 为规范教代会提案工作，保障教职工民主管理权利，根据《深圳大学教职工代表大会规定》制定本办法。

第二条 教代会提案是教职工代表通过教代会向学校提出的意见和建议，是教职工参与学校民主管理的重要形式。

第三条 提案工作应当遵循民主、公开、规范的原则。

第二章 提案的范围

第四条 提案应当围绕学校改革、发展、建设以及教职工切身利益等重大事项提出。

第五条 下列内容可以提出提案：
（一）学校发展规划、重大改革方案；
（二）教学、科研、行政管理等方面的重要制度；
（三）教职工福利待遇、劳动保护等切身利益问题；
（四）校园建设、后勤服务等方面的问题；
（五）其他需要通过教代会解决的问题。

第六条 下列内容不属于提案范围：
（一）属于具体行政事务的问题；
（二）已经解决或正在解决的问题；
（三）内容空泛、无具体建议的；
（四）涉及个人私事的问题。

第三章 提案的提出

第七条 教代会代表可以单独提出提案，也可以联名提出提案。

第八条 提案应当一事一案，有情况、有分析、有具体建议。

第九条 提案应当在教代会规定的截止日期前提出。`,
    },
    2: {
      title: '提案处理流程说明',
      content: `提案处理流程如下：

一、提案提交
1. 教代会代表登录系统，填写提案内容
2. 选择提案类型（个人提案/集体提案）
3. 提交提案至系统

二、提案审核
1. 教代会工作委员会对提案进行初步审核
2. 审核结果分为：已立案、不立案
   - 已立案：符合提案要求，进入处理流程
   - 不立案：不符合提案要求，告知提案人

三、提案办理
1. 已立案的提案由教代会工作委员会转交相关职能部门处理
2. 职能部门在规定时间内研究处理
3. 处理过程中可以与提案人沟通

四、提案答复
1. 职能部门处理完毕后，形成书面答复意见
2. 教代会工作委员会审核答复意见
3. 将答复意见送达提案人

五、提案归档
1. 提案办理完毕后，相关材料归档保存
2. 作为教代会工作资料备查

注意事项：
- 提案处理一般应在30个工作日内完成
- 提案人可以随时查询提案处理进度
- 对答复不满意的，可以申请重新审议`,
    },
    3: {
      title: '提案人权利与义务',
      content: `一、提案人的权利

1. 提案权
教代会代表有权依照规定向教代会提出提案。

2. 知情权
提案人有权了解提案的处理情况、办理进度和答复意见。

3. 监督权
提案人有权对提案办理情况进行监督，对处理结果不满意的可以提出意见。

4. 附议权
教代会代表可以联名提出提案，也可以为其他代表的提案附议。

二、提案人的义务

1. 实事求是
提案内容应当客观真实，有事实依据。

2. 一事一案
每件提案只反映一个问题，便于处理和答复。

3. 建设性
提案应当提出解决问题的具体建议和方案。

4. 规范性
提案应当按照规定的格式和程序提出。

5. 配合义务
提案人应当配合职能部门了解情况、补充材料等工作。

三、附议人的权利与义务

1. 附议人有权了解所附议提案的处理情况。

2. 附议人可以撤销附议，但应当以书面形式提出。

3. 附议人对提案内容负有连带责任。`,
    },
  };

  useEffect(() => {
    async function fetchArticleDetail() {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/about/${params.id}`, {
          cache: 'no-store',
        });
        const json = await res.json();

        if (json.success && json.data) {
          setArticle(json.data);
        } else {
          // 即使数据库没有数据，也设置一个空对象以便显示默认内容
          setArticle({} as AboutWork);
        }
      } catch (error) {
        console.error('Error fetching article detail:', error);
        // 出错时也设置空对象
        setArticle({} as AboutWork);
      } finally {
        setLoading(false);
      }
    }
    fetchArticleDetail();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-amber-500 animate-spin" />
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  // 获取显示内容（数据库数据或默认内容）
  const idNum = parseInt(params.id as string);
  const defaultContent = defaultContents[idNum];
  const displayTitle = article?.title || defaultContent?.title || '文档';
  const displayContent = article?.context || defaultContent?.content || '暂无内容';
  const displayAttachment = article?.attachment;

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-amber-500 transition-colors flex items-center gap-1">
          <Home size={14} />
          首页
        </Link>
        <span>/</span>
        <Link href="/about" className="hover:text-amber-500 transition-colors">
          关于提案工作
        </Link>
        <span>/</span>
        <span className="text-gray-800">详情</span>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-amber-500 hover:text-amber-600 transition-colors mb-6"
        >
          <ArrowLeft size={18} />
          返回列表
        </button>

        {/* 文章详情 */}
        <article className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 标题区域 */}
          <div className="p-8 pb-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">{displayTitle}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {article?.name && (
                <div className="flex items-center gap-1">
                  <User size={16} />
                  {article.name}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                {article?.createat?.split(' ')[0] || '-'}
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-8">
            <div
              className="prose prose-amber max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
              style={{ textIndent: '2em' }}
              dangerouslySetInnerHTML={{
                __html: displayContent.split('\n').map(line => `<p style="margin-bottom: 0.8em;">${line || '&nbsp;'}</p>`).join('')
              }}
            />
          </div>

          {/* 附件 */}
          {displayAttachment && (
            <div className="px-8 pb-8">
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Download size={20} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">附件下载</p>
                  <p className="text-xs text-gray-500 mt-0.5">{displayAttachment}</p>
                </div>
                <a
                  href={displayAttachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Download size={16} />
                  下载
                </a>
              </div>
            </div>
          )}
        </article>

        {/* 相关操作 */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 bottom-actions">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
          >
            <Printer size={18} />
            打印
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-amber-500 text-amber-500 rounded-xl hover:bg-amber-50 transition-all font-medium flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
