'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AboutWork } from '@/types';
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronUp,
  BookOpen,
  Download,
  Loader2,
} from 'lucide-react';

export default function AboutPage() {
  const [articles, setArticles] = useState<AboutWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    async function fetchAboutData() {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/about?limit=${pageSize}&page=${currentPage}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (json.success) {
          setArticles(json.data);
          setTotalArticles(json.pagination?.total || json.data.length);
        }
      } catch (error) {
        console.error('Error fetching about data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAboutData();
  }, [currentPage]);

  const totalPages = Math.ceil(totalArticles / pageSize) || 1;
  const currentArticles = articles;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-[#1779DC] transition-colors flex items-center gap-1">
          <Home size={14} />
          首页
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">关于提案工作</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* 页面标题 */}
        <div className="section-header p-6 pb-4">
          <h1 className="text-2xl font-bold text-[#2861AE] flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            关于提案工作
          </h1>
          <p className="text-sm text-gray-500 mt-2 ml-12">
            了解教代会提案工作的相关规定和流程
          </p>
        </div>

        {/* 文档列表 */}
        <div className="p-6 pt-0">
          <div className="grid md:grid-cols-2 gap-4">
            {currentArticles.length > 0 ? (
              currentArticles.map((article, index) => (
                <Link
                  key={article.gytagzId}
                  href={`/about/${article.gytagzId}`}
                  className="group p-5 rounded-xl border border-gray-100 hover:border-amber-400 hover:shadow-lg transition-all animate-slide-up relative overflow-hidden"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full transition-transform group-hover:scale-150" />
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-md">
                      <FileText size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-800 group-hover:text-amber-600 transition-colors font-semibold line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                        <Calendar size={12} />
                        {article.createat?.split(' ')[0]}
                      </p>
                    </div>
                    {article.attachment ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(article.attachment, '_blank');
                        }}
                        className="text-gray-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all flex-shrink-0 p-1"
                        title="下载附件"
                      >
                        <Download size={18} />
                      </button>
                    ) : (
                      <Download size={18} className="text-gray-300 flex-shrink-0" />
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 text-gray-500">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* 分页 */}
        <div className="p-6 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
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

              <span className="text-sm text-gray-600 px-2 font-medium">
                第 {currentPage} / {totalPages} 页
              </span>

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
                className="w-16 px-3 py-2 border border-gray-200 rounded-xl text-center focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
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
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
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
