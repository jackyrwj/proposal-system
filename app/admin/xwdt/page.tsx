'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  Newspaper,
  X,
} from 'lucide-react';
import { News } from '@/types';

export default function AdminXwdtPage() {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNews, setTotalNews] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const pageSize = 20;

  useEffect(() => {
    fetchNews();
  }, [currentPage]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const keywordParam = searchKeyword ? `&keyword=${encodeURIComponent(searchKeyword)}` : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/news?limit=${pageSize}&page=${currentPage}${keywordParam}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success) {
        setNewsList(json.data);
        setTotalNews(json.pagination?.total || json.data.length);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchNews();
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    setCurrentPage(1);
    fetchNews();
  };

  const totalPages = Math.ceil(totalNews / pageSize) || 1;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(newsList.map(n => n.newsId));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条新闻吗？')) return;

    try {
      const res = await fetch(`/api/admin/xwdt/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchNews();
      } else {
        alert(json.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="text-[#1779DC] animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">提案工作动态管理</h1>
          <p className="text-gray-500 mt-1">共 {totalNews} 条工作动态</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedItems.length === 0) {
                alert('请先选择要删除的新闻');
                return;
              }
              if (confirm(`确定要删除选中的 ${selectedItems.length} 条新闻吗？`)) {
                // Handle batch delete
              }
            }}
            disabled={selectedItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Trash2 size={18} />
            删除所选 ({selectedItems.length})
          </button>
          <Link
            href="/admin/xwdt/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1779DC] to-[#2861AE] hover:shadow-lg text-white rounded-xl transition-all"
          >
            <Plus size={18} />
            发布动态
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <form onSubmit={handleSearch} className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索标题或发布人..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-12 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-[#1779DC] hover:bg-[#2861AE] text-white rounded-xl transition-colors">
            <Search size={18} />
            搜索
          </button>
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === newsList.length && newsList.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#1779DC] focus:ring-[#1779DC]"
                  />
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">标题</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">发布人</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">发布时间</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {newsList.length > 0 ? (
                newsList.map((item) => (
                  <tr key={item.newsId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.newsId)}
                        onChange={(e) => handleSelectItem(item.newsId, e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#1779DC] focus:ring-[#1779DC]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Newspaper size={18} className="text-amber-600" />
                        </div>
                        <Link
                          href={`/admin/xwdt/${item.newsId}`}
                          className="text-[#1779DC] hover:text-[#2861AE] font-medium hover:underline max-w-xs truncate block"
                        >
                          {item.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {item.createat?.split(' ')[0]}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/xwdt/${item.newsId}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.newsId)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} />
                上一页
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                下一页
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页，共 {totalNews} 条
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
