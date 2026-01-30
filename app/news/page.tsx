'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { News } from '@/types';
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Home,
  ChevronUp,
  Newspaper,
} from 'lucide-react';

// 响应式样式
const responsiveStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .news-animate-fade-in { animation: fadeIn 0.3s ease-out; }
  .news-animate-slide-up { animation: slideUp 0.4s ease-out; }

  @media (max-width: 768px) {
    .news-hero { padding: 16px 12px !important; }
    .news-hero-title { font-size: 20px !important; }
    .news-hero-icon { width: 40px !important; height: 40px !important; }
    .news-hero-icon svg { size: 20px !important; }
    .news-container { margin-top: 0 !important; padding: 0 12px !important; }
    .news-card { padding: 16px !important; border-radius: 12px !important; margin-bottom: 10px !important; }
    .news-header { padding: 16px !important; flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
    .news-header h1 { font-size: 18px !important; }
    .news-header p { margin-left: 0 !important; margin-top: 8px !important; font-size: 12px !important; }
    .news-item { padding: 12px 14px !important; flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
    .news-item-index { width: 36px !important; height: 36px !important; font-size: 12px !important; order: -1 !important; }
    .news-item-title { font-size: 15px !important; line-height: 1.5 !important; }
    .news-item-date { flex-direction: row !important; gap: 8px !important; font-size: 12px !important; }
    .news-item-arrow { display: none !important; }
    .news-pagination { flex-direction: column !important; gap: 12px !important; }
    .news-pagination-controls { width: 100% !important; justify-content: center !important; flex-wrap: wrap !important; gap: 6px !important; }
    .news-pagination-info { width: 100% !important; justify-content: center !important; }
    .news-footer { padding: 12px !important; gap: 12px !important; }
  }
`;

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNews, setTotalNews] = useState(0);
  const pageSize = 15;

  // 注入响应式样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = responsiveStyles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    async function fetchNewsData() {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/news?limit=${pageSize}&page=${currentPage}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (json.success) {
          setNews(json.data);
          setTotalNews(json.pagination?.total || json.data.length);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchNewsData();
  }, [currentPage]);

  const totalPages = Math.ceil(totalNews / pageSize) || 1;

  const currentNews = news;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1779DC] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 news-animate-fade-in news-container">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-[#1779DC] transition-colors flex items-center gap-1">
          <Home size={14} />
          首页
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">工作动态</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden news-card">
        {/* 页面标题 */}
        <div className="section-header p-6 pb-4 news-header">
          <h1 className="text-2xl font-bold text-[#2861AE] flex items-center gap-2 news-hero-title">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl flex items-center justify-center news-hero-icon">
              <Newspaper size={20} className="text-white" />
            </div>
            提案工作动态
          </h1>
          <p className="text-sm text-gray-500 mt-2 ml-12">
            共 {totalNews} 条新闻，当前第 {currentPage} / {totalPages} 页
          </p>
        </div>

        {/* 新闻列表 */}
        <div className="p-6 pt-0">
          <div className="space-y-3">
            {currentNews.map((item, index) => (
              <Link
                key={item.newsId}
                href={`/news/${item.newsId}`}
                className="flex items-center gap-4 p-5 rounded-xl border border-gray-100 hover:border-[#1779DC] hover:shadow-lg transition-all group news-item"
                style={{ animationDelay: `${index * 30}ms`, animation: 'slideUp 0.4s ease-out forwards', opacity: 0 }}
              >
                <span className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#1779DC] to-[#2861AE] text-white rounded-xl flex items-center justify-center font-bold text-sm group-hover:scale-110 group-hover:rotate-3 transition-all shadow-md news-item-index">
                  {String((currentPage - 1) * pageSize + index + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-800 group-hover:text-[#1779DC] transition-colors font-semibold news-item-title">
                    {item.title}
                  </h3>
                </div>
                <div className="news-item-date flex items-center gap-1.5 text-sm text-gray-400 flex-shrink-0">
                  <Calendar size={14} />
                  {item.createat?.split(' ')[0]}
                </div>
                <ArrowRight size={18} className="text-gray-300 group-hover:text-[#1779DC] group-hover:translate-x-1 transition-all flex-shrink-0 news-item-arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* 分页 */}
        <div className="p-6 pt-4 news-pagination">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 news-pagination-controls">
              <button
                onClick={() => {
                  setCurrentPage(Math.max(1, currentPage - 1));
                  scrollToTop();
                }}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <ChevronLeft size={18} />
                上一页
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) =>
                  typeof page === 'number' ? (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentPage(page);
                        scrollToTop();
                      }}
                      className={`w-10 h-10 rounded-xl font-medium transition-all ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white shadow-md'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={index} className="px-2 text-gray-400">
                      {page}
                    </span>
                  )
                )}
              </div>

              <button
                onClick={() => {
                  setCurrentPage(Math.min(totalPages, currentPage + 1));
                  scrollToTop();
                }}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                下一页
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">跳转到</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                className="w-16 px-3 py-2 border border-gray-200 rounded-xl text-center focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt((e.target as HTMLInputElement).value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                      scrollToTop();
                    }
                  }
                }}
              />
              <span className="text-sm text-gray-500">页</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部快速链接 */}
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm news-footer">
        <Link
          href="/"
          className="flex items-center gap-1.5 px-4 py-2 text-[#1779DC] hover:bg-blue-50 rounded-xl transition-colors font-medium"
        >
          <Home size={14} />
          返回首页
        </Link>
        <span className="text-gray-300">|</span>
        <button
          onClick={scrollToTop}
          className="flex items-center gap-1.5 px-4 py-2 text-[#1779DC] hover:bg-blue-50 rounded-xl transition-colors font-medium"
        >
          <ChevronUp size={14} />
          返回顶部
        </button>
      </div>
    </div>
  );
}
