'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  Loader2,
  Sparkles,
  Building2,
  User,
  Calendar,
} from 'lucide-react';
import { FormalProposal, FORMAL_PROPOSAL_PROCESS_MAP, Proposal, PROPOSAL_TYPE_MAP, PROPOSAL_PROCESS_STATUS_MAP } from '@/types';

export default function AdminZstaPage() {
  const [proposals, setProposals] = useState<FormalProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProposals, setTotalProposals] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actualKeyword, setActualKeyword] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // 删除状态
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingSelected, setDeletingSelected] = useState(false);

  // AI转换提案的展开状态和来源提案缓存
  const [expandedAIProposals, setExpandedAIProposals] = useState<Set<number>>(new Set());
  const [sourceProposalsCache, setSourceProposalsCache] = useState<Record<number, Proposal[]>>({});

  const pageSize = 20;

  useEffect(() => {
    fetchProposals();
  }, [currentPage, actualKeyword]);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/formal-proposals?limit=${pageSize}&page=${currentPage}`;
      if (actualKeyword) {
        url += `&keyword=${encodeURIComponent(actualKeyword)}&type=title`;
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
  };

  const handleSearch = () => {
    setActualKeyword(searchKeyword);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalProposals / pageSize) || 1;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(proposals.map(p => p.zstaId));
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
      <span className={`badge ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  // 格式化正式提案编号：年份 + ZSTA + zstaId (3位)
  const formatProposalCode = (proposal: FormalProposal) => {
    const year = proposal.createAt ? new Date(new Date(proposal.createAt).getTime() + (8 * 60 * 60 * 1000)).getFullYear() : new Date().getFullYear();
    return `${year}ZSTA${String(proposal.zstaId).padStart(3, '0')}`;
  };

  // 检查是否为AI转换的正式提案
  const isFromAIConversion = (proposal: FormalProposal): boolean => {
    return !!proposal.sourceTajyIds;
  };

  // 获取来源提案编号
  const getSourceProposalCodes = (proposal: FormalProposal): string => {
    if (!proposal.sourceTajyIds) return '';
    try {
      const sourceIds = JSON.parse(proposal.sourceTajyIds) as number[];
      return sourceIds.map(id => `TY${String(id).padStart(4, '0')}`).join(', ');
    } catch {
      return '';
    }
  };

  // 解析来源提案ID列表
  const getSourceProposalIds = (proposal: FormalProposal): number[] | null => {
    if (!proposal.sourceTajyIds) return null;
    try {
      const sourceIds = JSON.parse(proposal.sourceTajyIds) as number[];
      return sourceIds.length > 0 ? sourceIds : null;
    } catch {
      return null;
    }
  };

  // 获取来源提案
  const fetchSourceProposals = async (proposalId: number, sourceIds: number[]): Promise<Proposal[]> => {
    // 检查缓存
    if (sourceProposalsCache[proposalId]) {
      return sourceProposalsCache[proposalId];
    }

    try {
      const ids = sourceIds.join(',');
      const res = await fetch(`/api/admin/tajy/proposals-by-ids?ids=${ids}`);
      const json = await res.json();
      if (json.success) {
        const sources = json.data || [];
        setSourceProposalsCache(prev => ({ ...prev, [proposalId]: sources }));
        return sources;
      }
    } catch (error) {
      console.error('Error fetching source proposals:', error);
    }
    return [];
  };

  // 切换AI转换提案的展开/收起状态
  const toggleAIProposal = async (proposal: FormalProposal) => {
    const sourceIds = getSourceProposalIds(proposal);
    if (!sourceIds) return;

    const newExpanded = new Set(expandedAIProposals);
    if (newExpanded.has(proposal.zstaId)) {
      // 收起
      newExpanded.delete(proposal.zstaId);
    } else {
      // 展开 - 如果还没加载过，则加载来源提案
      newExpanded.add(proposal.zstaId);
      if (!sourceProposalsCache[proposal.zstaId]) {
        await fetchSourceProposals(proposal.zstaId, sourceIds);
      }
    }
    setExpandedAIProposals(newExpanded);
  };

  // 刷新提案列表并保持滚动位置
  const fetchProposalsPreservingScroll = async () => {
    const scrollY = window.scrollY;
    await fetchProposals();
    // 等待 DOM 更新后恢复滚动位置
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  // 删除单个提案
  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`确定要删除正式提案「${title}」吗？`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/formal-proposals/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchProposalsPreservingScroll();
      } else {
        alert(json.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting proposal:', error);
      alert('删除失败，请稍后重试');
    } finally {
      setDeletingId(null);
    }
  };

  // 批量删除选中的提案
  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) {
      alert('请先选择要删除的提案');
      return;
    }
    if (!confirm(`确定要删除选中的 ${selectedItems.length} 条正式提案吗？`)) return;

    setDeletingSelected(true);
    try {
      // 并行删除所有选中的提案
      const results = await Promise.allSettled(
        selectedItems.map(id =>
          fetch(`/api/formal-proposals/${id}`, { method: 'DELETE' })
        )
      );

      // 检查是否有失败的
      const failedCount = results.filter(r =>
        r.status === 'fulfilled' && !r.value.ok
      ).length;

      if (failedCount > 0) {
        alert(`删除完成，但 ${failedCount} 条删除失败`);
      }

      setSelectedItems([]);
      fetchProposalsPreservingScroll();
    } catch (error) {
      console.error('Error batch deleting proposals:', error);
      alert('批量删除失败，请稍后重试');
    } finally {
      setDeletingSelected(false);
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
          <h1 className="text-2xl font-bold text-gray-800">正式提案管理</h1>
          <p className="text-gray-500 mt-1">共 {totalProposals} 条正式提案</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBatchDelete}
            disabled={selectedItems.length === 0 || deletingSelected}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            {deletingSelected ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            删除所选 ({selectedItems.length})
          </button>
          <Link
            href="/admin/zsta/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1779DC] to-[#2861AE] hover:shadow-lg text-white rounded-xl transition-all"
          >
            <Plus size={18} />
            添加提案
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索提案标题或编号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            />
          </div>
          <button onClick={handleSearch} className="flex items-center gap-2 px-6 py-3 bg-[#1779DC] hover:bg-[#2861AE] text-white rounded-xl transition-colors">
            <Search size={18} />
            搜索
          </button>
        </div>
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
                    checked={selectedItems.length === proposals.length && proposals.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#1779DC] focus:ring-[#1779DC]"
                  />
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">编号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">提案名称</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">主办单位</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">处理状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">提交时间</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proposals.length > 0 ? (
                proposals.map((proposal) => {
                  const sourceIds = getSourceProposalIds(proposal);
                  const isExpanded = expandedAIProposals.has(proposal.zstaId);
                  const sourceProposals = sourceProposalsCache[proposal.zstaId] || [];

                  return (
                    <React.Fragment key={proposal.zstaId}>
                      {/* 主提案行 */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(proposal.zstaId)}
                            onChange={(e) => handleSelectItem(proposal.zstaId, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-[#1779DC] focus:ring-[#1779DC]"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {sourceIds && (
                              <button
                                onClick={() => toggleAIProposal(proposal)}
                                className="text-purple-600 hover:text-purple-700 transition-colors"
                                title={isExpanded ? '收起来源提案' : '查看来源提案'}
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronDown size={16} className="-rotate-90" />}
                              </button>
                            )}
                            <span className="font-mono text-sm text-gray-600">{formatProposalCode(proposal)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/admin/zsta/${proposal.zstaId}`}
                                className="text-[#1779DC] hover:text-[#2861AE] font-medium hover:underline max-w-xs truncate block"
                              >
                                {proposal.title}
                              </Link>
                              {sourceIds && isExpanded && (
                                <div className="text-xs text-gray-400 mt-1">
                                  来源: {sourceIds.map(id => `TY${String(id).padStart(4, '0')}`).join(', ')}
                                </div>
                              )}
                            </div>
                            {isFromAIConversion(proposal) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                                <Sparkles size={10} />
                                来自AI转换
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{proposal.management || '-'}</td>
                        <td className="px-6 py-4">{getStatusBadge(proposal.process)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{proposal.createAt || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/zsta/${proposal.zstaId}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit size={16} />
                            </Link>
                            <button
                              onClick={() => handleDelete(proposal.zstaId, proposal.title)}
                              disabled={deletingId === proposal.zstaId}
                              className={`p-2 rounded-lg transition-colors ${
                                deletingId === proposal.zstaId
                                  ? 'text-gray-400 bg-gray-100 cursor-wait'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              title="删除"
                            >
                              {deletingId === proposal.zstaId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* 来源提案子行 */}
                      {isExpanded && sourceIds && sourceProposals.map((source) => (
                        <tr key={`source-${proposal.zstaId}-${source.tajyId}`} className="bg-purple-50/50 hover:bg-purple-50/70 transition-colors">
                          <td className="px-6 py-3">
                            {/* 空单元格，缩进效果 */}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2 pl-4">
                              <div className="w-0.5 h-4 bg-purple-300 rounded"></div>
                              <span className="font-mono text-xs text-gray-500">
                                TY{String(source.tajyId).padStart(4, '0')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2 pl-4">
                              <div className="w-0.5 h-4 bg-purple-300 rounded"></div>
                              <Link
                                href={`/admin/tajy/${source.tajyId}`}
                                className="text-gray-600 hover:text-gray-800 text-sm truncate block max-w-xs"
                                title={source.title}
                              >
                                {source.title}
                              </Link>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Building2 size={12} />
                              {source.depart || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {PROPOSAL_PROCESS_STATUS_MAP[source.process] || '未知'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar size={10} />
                              {source.createAt || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <User size={10} />
                              {source.name || '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
              第 {currentPage} / {totalPages} 页，共 {totalProposals} 条
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
