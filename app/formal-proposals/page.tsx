'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FormalProposal, PROCESS_STATUS_MAP, FORMAL_PROPOSAL_PROCESS_MAP } from '@/types';
import { Search, Filter, FileText, CheckCircle, Clock, ChevronLeft, ChevronRight, ArrowRight, Loader2, X, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'code' | 'title' | 'management' | 'status' | 'date';

// 响应式样式
const responsiveStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .formal-proposals-animate-fade-in { animation: fadeIn 0.3s ease-out; }

  @media (max-width: 768px) {
    .formal-hero { padding: 20px 12px !important; }
    .formal-hero-title { font-size: 22px !important; }
    .formal-hero-icon { width: 48px !important; height: 48px !important; }
    .formal-hero-icon svg { size: 24px !important; }
    .formal-container { margin: -20px auto 20px !important; padding: 0 12px !important; }
    .formal-card { padding: 16px !important; border-radius: 16px !important; }
    .formal-section-title { font-size: 16px !important; margin-bottom: 14px !important; }
    .formal-search-box { padding: 12px !important; flex-direction: column !important; }
    .formal-search-input { width: 100% !important; }
    .formal-search-select { width: 100% !important; }
    .formal-search-btn { width: 100% !important; justify-content: center !important; }
    .formal-filter-box { padding: 10px 12px !important; font-size: 13px !important; }
    .formal-pagination { flex-direction: column !important; gap: 12px !important; }
    .formal-pagination-info { width: 100% !important; justify-content: center !important; }
    .formal-page-controls { width: 100% !important; justify-content: center !important; flex-wrap: wrap !important; gap: 8px !important; }
    .formal-table-container { margin: 0 -12px !important; padding: 0 12px !important; overflow-x: auto !important; }
    .formal-card-item { padding: 14px !important; margin-bottom: 10px !important; border-radius: 12px !important; }
    .formal-card-header { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; margin-bottom: 10px !important; }
    .formal-card-meta { flex-wrap: wrap !important; gap: 8px !important; }
    .formal-card-row { flex-direction: column !important; gap: 8px !important; }
    .formal-card-label { width: 70px !important; flex-shrink: 0 !important; }
    .formal-card-value { flex: 1 !important; }
    .formal-footer-link { padding: 12px !important; }
  }
`;

export default function FormalProposalsPage() {
  const [proposals, setProposals] = useState<FormalProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProposals, setTotalProposals] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actualKeyword, setActualKeyword] = useState('');
  const [searchType, setSearchType] = useState('1');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = 50;

  // 注入响应式样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = responsiveStyles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    async function fetchFormalProposals() {
      setLoading(true);
      try {
        const isSearching = actualKeyword.trim() !== '';
        let url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/formal-proposals?limit=${pageSize}&page=${currentPage}`;

        // 如果有搜索关键词，添加搜索参数
        if (isSearching) {
          if (searchType === '1') {
            url += `&keyword=${encodeURIComponent(actualKeyword)}&type=title`;
          } else if (searchType === '2') {
            url += `&keyword=${encodeURIComponent(actualKeyword)}&type=code`;
          } else if (searchType === '3') {
            url += `&keyword=${encodeURIComponent(actualKeyword)}&type=management`;
          }
        }

        const res = await fetch(url, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (json.success) {
          setProposals(json.data);
          setTotalProposals(json.pagination?.total || json.data.length);
        }
      } catch (error) {
        console.error('Error fetching formal proposals:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFormalProposals();
  }, [currentPage, actualKeyword, searchType]);

  // 排序逻辑
  const sortedProposals = useMemo(() => {
    const sorted = [...proposals];
    sorted.sort((a, b) => {
      let compareValue = 0;
      switch (sortField) {
        case 'code':
          compareValue = a.zstaId - b.zstaId;
          break;
        case 'title':
          compareValue = a.title.localeCompare(b.title, 'zh-CN');
          break;
        case 'management':
          compareValue = (a.management || '').localeCompare(b.management || '', 'zh-CN');
          break;
        case 'status':
          compareValue = (a.process || 0) - (b.process || 0);
          break;
        case 'date':
          compareValue = new Date(a.createAt || 0).getTime() - new Date(b.createAt || 0).getTime();
          break;
      }
      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }, [proposals, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown size={14} className="text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-[#1779DC]" />
      : <ChevronDown size={14} className="text-[#1779DC]" />;
  };

  // 格式化正式提案编号：年份 + ZSTA + zstaId (3位)
  const formatProposalCode = (proposal: FormalProposal) => {
    const year = proposal.createAt ? new Date(new Date(proposal.createAt).getTime() + (8 * 60 * 60 * 1000)).getFullYear() : new Date().getFullYear();
    return `${year}ZSTA${String(proposal.zstaId).padStart(3, '0')}`;
  };

  const totalPages = Math.ceil(totalProposals / pageSize) || 1;

  const handleSearch = () => {
    setActualKeyword(searchKeyword);
    setCurrentPage(1);
  };

  const getStatusBadge = (process: number | undefined | null) => {
    // 只支持 0, 1, 2，其他值默认为 0 (未处理)
    const validProcess = (process !== null && process !== undefined && FORMAL_PROPOSAL_PROCESS_MAP[process])
      ? process
      : 0;
    const status = FORMAL_PROPOSAL_PROCESS_MAP[validProcess];
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
      '未处理': { color: 'badge-error', icon: <Clock size={12} /> },
      '正在处理': { color: 'badge-info', icon: <Clock size={12} /> },
      '处理完毕': { color: 'badge-success', icon: <CheckCircle size={12} /> },
    };
    const config = statusMap[status] || { color: 'badge-error', icon: <Clock size={12} /> };
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

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

  return (
    <div className="container mx-auto px-4 py-8 formal-proposals-animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden formal-card">
        {/* 页面标题 */}
        <div className="section-header p-6 pb-4 formal-section-title">
          <h1 className="text-2xl font-bold text-[#2861AE] flex items-center gap-2 formal-hero-title">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl flex items-center justify-center formal-hero-icon">
              <FileText size={20} className="text-white" />
            </div>
            正式提案
          </h1>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6 px-6">
          <div className="flex gap-3 items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-100 formal-search-box">
            <div className="flex-1 relative formal-search-input">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="请输入关键词..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all bg-white"
              />
              {searchKeyword && (
                <button
                  onClick={() => {
                    setSearchKeyword('');
                    setActualKeyword('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all bg-white formal-search-select"
            >
              <option value="1">按标题</option>
              <option value="2">按编号</option>
              <option value="3">按主办单位</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2 formal-search-btn"
            >
              <Search size={18} />
              搜索
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mb-4 px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl text-sm formal-filter-box">
            <Filter size={16} className="text-[#1779DC]" />
            <span className="text-gray-600">
              共有 <strong className="text-[#1779DC]">{totalProposals}</strong> 条提案，
              第 <strong className="text-[#1779DC]">{currentPage}</strong> / {totalPages} 页
            </span>
          </div>
        </div>

        {/* 提案列表 */}
        <div className="formal-table-container px-6">
          {/* 桌面端表格 */}
          <table className="table-modern hidden md:table">
            <thead>
              <tr>
                <th className="px-5 py-4 text-left rounded-tl-xl">
                  <button onClick={() => handleSort('code')} className="flex items-center gap-2 hover:text-[#1779DC] transition-colors">
                    编号 {renderSortIcon('code')}
                  </button>
                </th>
                <th className="px-5 py-4 text-left">
                  <button onClick={() => handleSort('title')} className="flex items-center gap-2 hover:text-[#1779DC] transition-colors">
                    提案名 {renderSortIcon('title')}
                  </button>
                </th>
                <th className="px-5 py-4 text-left">
                  <button onClick={() => handleSort('management')} className="flex items-center gap-2 hover:text-[#1779DC] transition-colors">
                    主办单位 {renderSortIcon('management')}
                  </button>
                </th>
                <th className="px-5 py-4 text-left">
                  <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-[#1779DC] transition-colors">
                    处理情况 {renderSortIcon('status')}
                  </button>
                </th>
                <th className="px-5 py-4 text-left rounded-tr-xl">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-2 hover:text-[#1779DC] transition-colors">
                    提交时间 {renderSortIcon('date')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedProposals.length > 0 ? (
                sortedProposals.map((proposal, index) => (
                  <tr key={proposal.zstaId} className="group" style={{ animationDelay: `${index * 20}ms` }}>
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-gray-500">{formatProposalCode(proposal)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/formal-proposals/${proposal.zstaId}`}
                        className="text-[#1779DC] hover:text-[#2861AE] font-medium transition-colors inline-flex items-center gap-1 group/link"
                      >
                        {proposal.title}
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                        {proposal.management || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(proposal.process)}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{proposal.createAt?.split(' ')[0]}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                    {loading ? '加载中...' : '暂无数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 移动端卡片布局 */}
          <div className="md:hidden">
            {sortedProposals.length > 0 ? (
              sortedProposals.map((proposal, index) => (
                <div
                  key={proposal.zstaId}
                  className="formal-card-item bg-gray-50 border border-gray-100 hover:border-[#1779DC] transition-all"
                  style={{ animationDelay: `${index * 20}ms`, animation: 'fadeIn 0.3s ease-out' }}
                >
                  <div className="formal-card-header flex justify-between items-start">
                    <Link
                      href={`/formal-proposals/${proposal.zstaId}`}
                      className="text-[#1779DC] hover:text-[#2861AE] font-medium transition-colors text-base"
                    >
                      {proposal.title}
                    </Link>
                    <span className="font-mono text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {formatProposalCode(proposal)}
                    </span>
                  </div>
                  <div className="formal-card-meta flex items-center gap-2 mb-2">
                    {getStatusBadge(proposal.process)}
                  </div>
                  <div className="formal-card-row flex text-sm text-gray-500">
                    <span className="formal-card-label">主办单位</span>
                    <span className="formal-card-value">{proposal.management || '-'}</span>
                  </div>
                  <div className="formal-card-row flex text-sm text-gray-500 mt-2">
                    <span className="formal-card-label">提交时间</span>
                    <span className="formal-card-value">{proposal.createAt?.split(' ')[0]}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                {loading ? '加载中...' : '暂无数据'}
              </div>
            )}
          </div>
        </div>

        {/* 分页 */}
        <div className="p-6 pt-4 formal-pagination">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 formal-page-controls">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
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
                          ? 'bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white shadow-md'
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
                    if (page >= 1 && page <= totalPages) setCurrentPage(page);
                  }
                }}
              />
              <span className="text-sm text-gray-500">页</span>
            </div>
          </div>
        </div>

        {/* 底部链接 */}
        <div className="px-6 pb-6 formal-footer-link">
          <Link
            href="/historical-formal-proposals"
            className="inline-flex items-center gap-2 text-[#1779DC] hover:text-[#2861AE] font-medium transition-colors group"
          >
            查看2016年前的正式提案
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
