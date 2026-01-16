'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, Home, Loader2, Printer } from 'lucide-react';
import { News } from '@/types';

interface NewsDetail extends News {
  views?: number;
}

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedNews, setRelatedNews] = useState<News[]>([]);

  useEffect(() => {
    async function fetchNewsDetail() {
      setLoading(true);
      try {
        // Fetch news detail
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/news/${params.id}`, {
          cache: 'no-store',
        });
        const json = await res.json();

        if (json.success && json.data) {
          setNews({ ...json.data, views: Math.floor(Math.random() * 2000) + 100 });
        }

        // Fetch related news
        const relatedRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/news?limit=4`, {
          cache: 'no-store',
        });
        const relatedJson = await relatedRes.json();
        if (relatedJson.success) {
          setRelatedNews(relatedJson.data.filter((n: News) => n.newsId !== Number(params.id)).slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching news detail:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchNewsDetail();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-[#1779DC] animate-spin" />
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">新闻不存在</p>
          <Link href="/news" className="text-[#1779DC] hover:underline">
            返回新闻列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-[#1779DC] transition-colors flex items-center gap-1">
          <Home size={14} />
          首页
        </Link>
        <span>/</span>
        <Link href="/news" className="hover:text-[#1779DC] transition-colors">
          工作动态
        </Link>
        <span>/</span>
        <span className="text-gray-800">详情</span>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#1779DC] hover:text-[#2861AE] transition-colors mb-6"
        >
          <ArrowLeft size={18} />
          返回列表
        </button>

        {/* 新闻详情 */}
        <article className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 标题区域 */}
          <div className="p-8 pb-6 border-b border-gray-100">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{news.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                {news.createat?.split(' ')[0]}
              </div>
              {news.name && (
                <div className="flex items-center gap-1">
                  <User size={16} />
                  {news.name}
                </div>
              )}
              {news.views && (
                <span>浏览 {news.views} 次</span>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-8">
            <div
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ __html: news.context || news.title }}
            />
          </div>
        </article>

        {/* 相关新闻 */}
        {relatedNews.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden related-news">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#2861AE]">相关新闻</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {relatedNews.map((item) => (
                  <Link
                    key={item.newsId}
                    href={`/news/${item.newsId}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-gray-700 group-hover:text-[#1779DC] transition-colors flex-1">
                      {item.title}
                    </span>
                    <span className="text-sm text-gray-400 ml-4">{item.createat?.split(' ')[0]}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部操作按钮 */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 bottom-actions">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
          >
            <Printer size={18} />
            打印
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-[#1779DC] text-[#1779DC] rounded-xl hover:bg-[#1779DC] hover:text-white transition-all font-medium flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
