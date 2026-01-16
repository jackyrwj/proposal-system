'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Clock,
  Loader2,
  X,
  Check,
  Sparkles,
  Wand2,
  Eye,
  User,
  Building2,
  Calendar,
  Undo,
  FileText,
  Bell,
} from 'lucide-react';
import { Proposal, PROCESS_STATUS_MAP, PROPOSAL_TYPE_MAP, PROPOSAL_PROCESS_STATUS_MAP } from '@/types';

interface MergeGroup {
  id: string;
  theme: string;
  proposals: Proposal[];
  reason: string;
  excludedProposalIds?: number[]; // 被排除的提案ID
}

interface MergeDialogData {
  open: boolean;
  loading: boolean;
  selectedProposals: Proposal[];
  result: {
    title: string;
    reason: string;
    suggest: string;
    management: string;
  } | null;
  editingResult: {
    title: string;
    reason: string;
    suggest: string;
    management: string;
  } | null;
}

// 转正式提案弹窗状态
interface ConvertDialogData {
  open: boolean;
  loading: boolean;
  sourceProposal: Proposal | null;
  result: {
    title: string;
    reason: string;
    suggest: string;
    management: string;
  } | null;
  editingResult: {
    title: string;
    reason: string;
    suggest: string;
    management: string;
  } | null;
}

export default function AdminTajyPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProposals, setTotalProposals] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actualKeyword, setActualKeyword] = useState('');
  const [searchType, setSearchType] = useState('1');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // AI 相关状态
  const [aiGroups, setAiGroups] = useState<MergeGroup[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // 合并弹窗状态
  const [mergeDialog, setMergeDialog] = useState<MergeDialogData>({
    open: false,
    loading: false,
    selectedProposals: [],
    result: null,
    editingResult: null,
  });

  // 转正式提案弹窗状态
  const [convertDialog, setConvertDialog] = useState<ConvertDialogData>({
    open: false,
    loading: false,
    sourceProposal: null,
    result: null,
    editingResult: null,
  });

  // 来源提案预览状态
  const [showSourcePreview, setShowSourcePreview] = useState(false);

  // 回复弹窗状态
  const [replyDialog, setReplyDialog] = useState<{
    open: boolean;
    proposal: Proposal | null;
    loading: boolean;
    formData: {
      replyDepartment: string;
      handleOpinion: string;
      detailReply: string;
      departmentName: string;
    };
    showPreview: boolean;
  }>({
    open: false,
    proposal: null,
    loading: false,
    formData: {
      replyDepartment: '',
      handleOpinion: '',
      detailReply: '',
      departmentName: '校工会',
    },
    showPreview: false,
  });

  // 已发送回复的提案ID集合
  const [sentReplyProposalIds, setSentReplyProposalIds] = useState<Set<number>>(new Set());

  // 提案详情弹窗状态
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean;
    proposal: Proposal | null;
  }>({
    open: false,
    proposal: null,
  });

  // 防止重复提交的标志 - 使用 ref 确保立即生效
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 合并提案的展开状态和来源提案缓存
  const [expandedMergedProposals, setExpandedMergedProposals] = useState<Set<number>>(new Set());
  const [sourceProposalsCache, setSourceProposalsCache] = useState<Record<number, Proposal[]>>({});

  const pageSize = 20;

  useEffect(() => {
    fetchProposals();
  }, [currentPage, actualKeyword, searchType]);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/proposals?limit=${pageSize}&page=${currentPage}`;
      if (actualKeyword) {
        const typeMap: Record<string, string> = { '1': 'title', '2': 'code', '3': 'depart' };
        url += `&keyword=${encodeURIComponent(actualKeyword)}&type=${typeMap[searchType] || 'title'}`;
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
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setActualKeyword(searchKeyword);
    setCurrentPage(1);
  };

  const fetchAiRecommendations = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/admin/tajy/analyze');
      const json = await res.json();
      if (json.success && json.data?.groups) {
        setAiGroups(json.data.groups);
      } else {
        alert(json.error || 'AI 分析失败');
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      alert('AI 分析失败，请检查 AI 服务是否启动');
    } finally {
      setAnalyzing(false);
    }
  };

  // 解析合并提案的来源ID
  const getSourceProposalIds = (proposal: Proposal): number[] | null => {
    if (proposal.description && proposal.description.startsWith('AI合并来源:')) {
      const idsStr = proposal.description.replace('AI合并来源:', '');
      const ids = idsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      return ids.length > 0 ? ids : null;
    }
    return null;
  };

  // 检查是否为合并生成的提案
  const isMergedProposal = (proposal: Proposal): boolean => {
    return getSourceProposalIds(proposal) !== null;
  };

  // 检查是否为子提案（description包含"AI合并来源:"）
  const isSubProposal = (proposal: Proposal): boolean => {
    return proposal.description?.startsWith('AI合并来源:') || false;
  };

  // 检查是否已转换为正式提案
  const isConvertedToFormal = (proposal: Proposal): boolean => {
    return proposal.description?.includes('已转换为正式提案:') || false;
  };

  // 获取转换后的正式提案ID
  const getConvertedFormalId = (proposal: Proposal): number | null => {
    const match = proposal.description?.match(/已转换为正式提案:(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  // 打开转正式提案弹窗
  const openConvertDialog = async (proposal: Proposal) => {
    // 检查是否为子提案
    if (isSubProposal(proposal)) {
      alert('子提案不能直接转换为正式提案，请通过合并后的主提案进行转换');
      return;
    }

    // 检查是否已转换
    if (isConvertedToFormal(proposal)) {
      const formalId = getConvertedFormalId(proposal);
      alert(`该提案已转换为正式提案 ${formalId ? `ZSTA${String(formalId).padStart(3, '0')}` : ''}`);
      return;
    }

    setConvertDialog({
      open: true,
      loading: true,
      sourceProposal: proposal,
      result: null,
      editingResult: null,
    });

    try {
      const res = await fetch('/api/admin/tajy/convert-to-formal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tajyId: proposal.tajyId,
          previewOnly: true,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setConvertDialog(prev => ({
          ...prev,
          loading: false,
          result: json.data,
          editingResult: json.data,
        }));
      } else {
        alert(json.error || 'AI 转换失败');
        setConvertDialog({
          open: false,
          loading: false,
          sourceProposal: null,
          result: null,
          editingResult: null,
        });
      }
    } catch (error) {
      console.error('Error converting proposal:', error);
      alert('AI 转换失败，请检查 AI 服务是否正常运行');
      setConvertDialog({
        open: false,
        loading: false,
        sourceProposal: null,
        result: null,
        editingResult: null,
      });
    }
  };

  // 确认转换为正式提案
  const confirmConvert = async () => {
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const { sourceProposal, editingResult } = convertDialog;

    setConvertDialog(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/admin/tajy/convert-to-formal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tajyId: sourceProposal?.tajyId,
          convertResult: editingResult,
          previewOnly: false,
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert(`转换成功！已生成正式提案 ${json.data.zstabh}`);
        setConvertDialog({
          open: false,
          loading: false,
          sourceProposal: null,
          result: null,
          editingResult: null,
        });
        fetchProposals();
      } else {
        alert(json.error || '转换失败');
        setConvertDialog(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error confirming convert:', error);
      alert('转换失败');
      setConvertDialog(prev => ({ ...prev, loading: false }));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // 打开发送回复弹窗
  const openReplyDialog = (proposal: Proposal) => {
    // 获取正式提案ID
    const formalId = getConvertedFormalId(proposal);
    setReplyDialog({
      open: true,
      proposal,
      loading: false,
      formData: {
        replyDepartment: proposal.management || '',
        handleOpinion: proposal.description || '',
        detailReply: '',
        departmentName: '校工会',
      },
      showPreview: false,
    });
  };

  // 关闭回复弹窗
  const closeReplyDialog = () => {
    setReplyDialog({
      open: false,
      proposal: null,
      loading: false,
      formData: {
        replyDepartment: '',
        handleOpinion: '',
        detailReply: '',
        departmentName: '校工会',
      },
      showPreview: false,
    });
  };

  // 切换预览
  const togglePreview = () => {
    setReplyDialog(prev => ({ ...prev, showPreview: !prev.showPreview }));
  };

  // 生成预览内容
  const generateReplyContent = () => {
    const { proposal, formData } = replyDialog;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    return `尊敬的 ${proposal?.name || ''} 老师：

您好！关于您提交的提案《${proposal?.title || ''}》，相关部门回复如下：

回复部门：${formData.replyDepartment || '待填写'}
处理意见：${formData.handleOpinion || '待填写'}
具体回复：${formData.detailReply || '待填写'}

反馈说明：满意请回复"收到"，如有其他意见请直接回复本邮件。

感谢您的支持！
${formData.departmentName} ${year}年${month}月${day}日`;
  };

  // 发送回复
  const sendReply = async () => {
    if (isSubmittingRef.current || isSubmitting) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setReplyDialog(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/admin/tajy/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: replyDialog.proposal?.tajyId,
          ...replyDialog.formData,
          replyContent: generateReplyContent(),
        }),
      });
      const json = await res.json();

      if (json.success) {
        // 标记为已发送
        const proposalId = replyDialog.proposal?.tajyId;
        if (proposalId) {
          setSentReplyProposalIds(prev => new Set([...prev, proposalId]));
        }
        alert('回复已发送！');
        closeReplyDialog();
      } else {
        alert(json.error || '发送失败');
        setReplyDialog(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('发送失败');
      setReplyDialog(prev => ({ ...prev, loading: false }));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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

  // 切换合并提案的展开/收起状态
  const toggleMergedProposal = async (proposal: Proposal) => {
    const sourceIds = getSourceProposalIds(proposal);
    if (!sourceIds) return;

    const newExpanded = new Set(expandedMergedProposals);
    if (newExpanded.has(proposal.tajyId)) {
      // 收起
      newExpanded.delete(proposal.tajyId);
    } else {
      // 展开 - 如果还没加载过，则加载来源提案
      newExpanded.add(proposal.tajyId);
      if (!sourceProposalsCache[proposal.tajyId]) {
        await fetchSourceProposals(proposal.tajyId, sourceIds);
      }
    }
    setExpandedMergedProposals(newExpanded);
  };

  const totalPages = Math.ceil(totalProposals / pageSize) || 1;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(proposals.map(p => p.tajyId));
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

  const getStatusBadge = (process: number) => {
    const status = PROPOSAL_PROCESS_STATUS_MAP[process] || '未知';
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
      '未审核': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Clock size={12} /> },
      '已立案': { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle size={12} /> },
      '不立案': { color: 'bg-red-100 text-red-700 border-red-200', icon: <X size={12} /> },
      '处理中': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={12} /> },
    };
    const config = statusMap[status] || { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
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

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条提案吗？')) return;

    try {
      const res = await fetch(`/api/admin/tajy/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchProposalsPreservingScroll();
      } else {
        alert(json.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleCancelMerge = async (proposal: Proposal) => {
    const sourceIds = getSourceProposalIds(proposal);
    if (!sourceIds) return;

    const sourceIdStr = sourceIds.map(id => `TY${String(id).padStart(4, '0')}`).join(', ');
    if (!confirm(
      `确定要取消合并吗？\n\n` +
      `此操作将：\n` +
      `1. 删除当前的合并提案\n` +
      `2. 恢复以下源提案状态：${sourceIdStr}\n\n` +
      `此操作不可撤销！`
    )) {
      return;
    }

    try {
      const res = await fetch('/api/admin/tajy/cancel-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergedProposalId: proposal.tajyId }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || '取消合并成功');
        // 清除相关缓存
        setExpandedMergedProposals(prev => {
          const newSet = new Set(prev);
          newSet.delete(proposal.tajyId);
          return newSet;
        });
        setSourceProposalsCache(prev => {
          const newCache = { ...prev };
          delete newCache[proposal.tajyId];
          return newCache;
        });
        fetchProposalsPreservingScroll();
      } else {
        alert(json.error || '取消合并失败');
      }
    } catch (error) {
      console.error('Cancel merge error:', error);
      alert('取消合并失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) {
      alert('请先选择要删除的提案');
      return;
    }
    if (!confirm(`确定要删除选中的 ${selectedItems.length} 条提案吗？`)) return;

    try {
      const res = await fetch('/api/admin/tajy/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedItems }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedItems([]);
        fetchProposalsPreservingScroll();
      } else {
        alert(json.error || '批量删除失败');
      }
    } catch (error) {
      alert('批量删除失败');
    }
  };

  // 打开 AI 合并弹窗
  const openMergeDialog = async (proposalsToMerge?: Proposal[]) => {
    const selectedProposals = proposalsToMerge || proposals.filter(p => selectedItems.includes(p.tajyId));

    if (selectedProposals.length < 2) {
      alert('请至少选择 2 条提案建议进行合并');
      return;
    }

    setMergeDialog({
      open: true,
      loading: true,
      selectedProposals,
      result: null,
      editingResult: null,
    });

    try {
      // 使用 previewOnly=true 仅获取预览，不插入数据库
      const res = await fetch('/api/admin/tajy/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalIds: selectedProposals.map(p => p.tajyId),
          previewOnly: true, // 预览模式，不插入数据库
        }),
      });
      const json = await res.json();

      if (json.success) {
        setMergeDialog(prev => ({
          ...prev,
          loading: false,
          result: json.data,
          editingResult: json.data,
        }));
      } else {
        alert(json.error || 'AI 合并失败');
        setMergeDialog({ open: false, loading: false, selectedProposals: [], result: null, editingResult: null });
      }
    } catch (error) {
      console.error('Error merging proposals:', error);
      alert('合并失败');
      setMergeDialog({ open: false, loading: false, selectedProposals: [], result: null, editingResult: null });
    }
  };

  // 确认合并
  const confirmMerge = async () => {
    // 防止重复提交 - 使用 ref 立即检查
    if (isSubmittingRef.current || isSubmitting) {
      console.log('[ConfirmMerge] 已有提交正在进行，忽略本次请求');
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const { selectedProposals, editingResult } = mergeDialog;

    setMergeDialog(prev => ({ ...prev, loading: true }));

    try {
      console.log('[ConfirmMerge] 开始合并请求（正式提交）');
      const res = await fetch('/api/admin/tajy/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalIds: selectedProposals.map(p => p.tajyId),
          mergeResult: editingResult,
          previewOnly: false, // 正式提交，插入数据库
        }),
      });
      const json = await res.json();

      console.log('[ConfirmMerge] API 响应:', json);

      if (json.success) {
        alert(`合并成功！已生成新的提案建议 TY${String(json.data.tajyId).padStart(4, '0')}，请审核后再转为正式提案`);
        // 清空 AI 推荐，不自动重新分析
        setAiGroups([]);
        setMergeDialog({ open: false, loading: false, selectedProposals: [], result: null, editingResult: null });
        setSelectedItems([]);
        // 刷新提案列表
        fetchProposals();
      } else {
        alert(json.error || '合并失败');
        setMergeDialog(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('[ConfirmMerge] Error:', error);
      alert('合并失败');
      setMergeDialog(prev => ({ ...prev, loading: false }));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      console.log('[ConfirmMerge] 提交完成');
    }
  };

  // 快速合并 AI 推荐的组
  const quickMergeGroup = async (group: MergeGroup) => {
    // 过滤掉被排除的提案
    const proposalsToMerge = group.proposals.filter(
      p => !group.excludedProposalIds?.includes(p.tajyId)
    );
    if (proposalsToMerge.length < 2) {
      alert('请至少保留 2 条提案进行合并');
      return;
    }
    openMergeDialog(proposalsToMerge);
  };

  // 从组中排除/恢复提案
  const toggleExcludeProposal = (group: MergeGroup, proposalId: number) => {
    setAiGroups(prevGroups =>
      prevGroups.map(g => {
        if (g.id === group.id) {
          const excluded = g.excludedProposalIds || [];
          const isExcluded = excluded.includes(proposalId);
          return {
            ...g,
            excludedProposalIds: isExcluded
              ? excluded.filter(id => id !== proposalId)
              : [...excluded, proposalId],
          };
        }
        return g;
      })
    );
  };

  // 检查提案是否被排除
  const isProposalExcluded = (group: MergeGroup, proposalId: number) => {
    return group.excludedProposalIds?.includes(proposalId) || false;
  };

  // 打开提案详情弹窗
  const openDetailDialog = (proposal: Proposal) => {
    setDetailDialog({ open: true, proposal });
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
          <h1 className="text-2xl font-bold text-gray-800">提案建议管理</h1>
          <p className="text-gray-500 mt-1">共 {totalProposals} 条提案</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBatchDelete}
            disabled={selectedItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Trash2 size={18} />
            删除所选 ({selectedItems.length})
          </button>
          <button
            onClick={() => selectedItems.length >= 2 ? openMergeDialog() : null}
            disabled={selectedItems.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            title={selectedItems.length < 2 ? '请至少选择2条提案' : 'AI 合并为新的提案建议'}
          >
            <Wand2 size={18} />
            AI 合并所选 ({selectedItems.length})
          </button>
          <Link
            href="/admin/tajy/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1779DC] to-[#2861AE] hover:shadow-lg text-white rounded-xl transition-all"
          >
            <Plus size={18} />
            添加提案
          </Link>
        </div>
      </div>

      {/* AI 推荐区域 */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl shadow-sm p-4">
          {aiGroups.length === 0 ? (
            // 未获取推荐时显示的引导界面
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-gray-800">AI 智能分组推荐</h3>
                  <p className="text-sm text-gray-500">
                    自动识别相似主题并分组，快速合并相关提案
                  </p>
                </div>
              </div>
              <button
                onClick={fetchAiRecommendations}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
              >
                {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {analyzing ? '分析中...' : '开始分析'}
              </button>
            </div>
          ) : analyzing ? (
            // 分析中状态
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 size={24} className="text-purple-600 animate-spin mr-3" />
              AI 正在分析提案...
            </div>
          ) : (
            // 显示推荐结果
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-600" />
                  <h2 className="text-lg font-bold text-gray-800">AI 分组推荐</h2>
                  <span className="text-sm text-gray-500">（{aiGroups.length} 组可合并）</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAiGroups([])}
                    className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-700 rounded-lg transition-colors border border-gray-200 text-sm"
                  >
                    <X size={14} />
                    收起
                  </button>
                  <button
                    onClick={fetchAiRecommendations}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-purple-600 hover:text-purple-700 rounded-xl transition-colors border border-purple-200 disabled:opacity-50 disabled:cursor-notallowed"
                  >
                    <Wand2 size={16} />
                    重新分析
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {aiGroups.map((group) => {
                  // 过滤掉 null 值的提案
                  const validProposals = group.proposals.filter(p => p != null);
                  const excludedCount = group.excludedProposalIds?.length || 0;
                  const remainingCount = validProposals.length - excludedCount;
                  return (
                    <div key={group.id} className="bg-white rounded-xl p-4 border border-purple-100 hover:border-purple-200 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 mb-1">{group.theme}</h3>
                          <p className="text-sm text-gray-500">{group.reason}</p>
                          {excludedCount > 0 && (
                            <p className="text-xs text-orange-500 mt-1">已排除 {excludedCount} 条提案，剩余 {remainingCount} 条可合并</p>
                          )}
                        </div>
                        <button
                          onClick={() => quickMergeGroup(group)}
                          disabled={remainingCount < 2}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors whitespace-nowrap"
                        >
                          <Sparkles size={16} />
                          生成提案建议 ({remainingCount})
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {validProposals.map((p) => {
                          const excluded = isProposalExcluded(group, p.tajyId);
                          return (
                            <div
                              key={p.tajyId}
                              className={`group relative px-3 py-1 rounded-lg text-sm flex items-center gap-2 transition-all ${
                                excluded
                                  ? 'bg-gray-100 text-gray-400 line-through'
                                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              }`}
                            >
                              <button
                                onClick={() => openDetailDialog(p)}
                                className="hover:underline truncate max-w-[200px]"
                                title="点击查看详情"
                              >
                                TY{String(p.tajyId).padStart(4, '0')} {p.title}
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openDetailDialog(p)}
                                  className="p-1 rounded transition-colors text-purple-600 hover:bg-purple-200"
                                  title="查看详情"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => toggleExcludeProposal(group, p.tajyId)}
                                className={`p-1 rounded transition-colors ${
                                  excluded
                                    ? 'text-green-600 hover:bg-green-100'
                                    : 'text-red-500 hover:bg-red-100'
                                }`}
                                title={excluded ? '恢复此提案' : '排除此提案'}
                              >
                                {excluded ? <Check size={14} /> : <X size={14} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索提案标题、编号或部门..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            />
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all bg-white"
          >
            <option value="1">按标题</option>
            <option value="2">按编号</option>
            <option value="3">按部门</option>
          </select>
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
                <th className="px-4 py-4 text-left whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === proposals.length && proposals.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#1779DC] focus:ring-[#1779DC]"
                  />
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">编号</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 min-w-[200px]">提案名称</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">提案人</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">部门</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">类型</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">处理状态</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">提交时间</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proposals.length > 0 ? (
                proposals.map((proposal) => {
                  const sourceIds = getSourceProposalIds(proposal);
                  const isExpanded = expandedMergedProposals.has(proposal.tajyId);
                  const sourceProposals = sourceProposalsCache[proposal.tajyId] || [];

                  return (
                    <React.Fragment key={proposal.tajyId}>
                      {/* 主提案行 */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(proposal.tajyId)}
                            onChange={(e) => handleSelectItem(proposal.tajyId, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-[#1779DC] focus:ring-[#1779DC]"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {sourceIds && (
                              <button
                                onClick={() => toggleMergedProposal(proposal)}
                                className="text-purple-600 hover:text-purple-700 transition-colors"
                                title={isExpanded ? '收起来源提案' : '查看来源提案'}
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            )}
                            <span className="font-mono text-sm text-gray-600 whitespace-nowrap">
                              TY{String(proposal.tajyId).padStart(4, '0')}
                            </span>
                            {sourceIds && (
                              <span className="whitespace-nowrap px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                AI合并
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-[200px]">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/admin/tajy/${proposal.tajyId}`}
                                className="text-[#1779DC] hover:text-[#2861AE] font-medium hover:underline max-w-xs truncate block"
                              >
                                {proposal.title}
                              </Link>
                              {sourceIds && isExpanded && (
                                <div className="text-xs text-gray-400 mt-1">
                                  来源: {sourceIds.map(id => `TY${String(id).padStart(4, '0')}`).join(', ')}
                                </div>
                              )}
                              {isConvertedToFormal(proposal) && (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs mt-1">
                                  <Sparkles size={10} />
                                  已转为正式提案
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{proposal.name || '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">{proposal.depart || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium whitespace-nowrap">
                            {PROPOSAL_TYPE_MAP[proposal.type] || '其他'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(proposal.process)}</td>
                        <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{proposal.createAt || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/tajy/${proposal.tajyId}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit size={16} />
                            </Link>
                            {/* AI转正式提案按钮 - 仅已立案的主提案显示，子提案不显示 */}
                            {!isSubProposal(proposal) && proposal.process === 1 && !isConvertedToFormal(proposal) && (
                              <button
                                onClick={() => openConvertDialog(proposal)}
                                className="p-2 rounded-lg transition-colors text-purple-600 hover:bg-purple-50"
                                title="AI转正式提案"
                              >
                                <Wand2 size={16} />
                              </button>
                            )}
                            {/* 取消合并按钮 */}
                            {sourceIds && (
                              <button
                                onClick={() => handleCancelMerge(proposal)}
                                className="p-2 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                title="取消合并"
                              >
                                <Undo size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(proposal.tajyId)}
                              className="p-2 rounded-lg transition-colors text-red-600 hover:bg-red-50"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* 来源提案子行 */}
                      {isExpanded && sourceIds && sourceProposals.map((source, idx) => (
                        <tr key={`source-${proposal.tajyId}-${source.tajyId}`} className="bg-purple-50/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {/* 空单元格，缩进效果 */}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 pl-4">
                              <div className="w-0.5 h-4 bg-purple-300 rounded"></div>
                              <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
                                TY{String(source.tajyId).padStart(4, '0')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 min-w-[200px]">
                            <div className="flex items-center gap-2 pl-4">
                              <div className="w-0.5 h-4 bg-purple-300 rounded"></div>
                              <Link
                                href={`/admin/tajy/${source.tajyId}`}
                                className="text-gray-600 hover:text-gray-800 text-sm truncate block max-w-xs"
                              >
                                {source.title}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{source.name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{source.depart || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs whitespace-nowrap">
                              {PROPOSAL_TYPE_MAP[source.type] || '其他'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs whitespace-nowrap">
                              {PROPOSAL_PROCESS_STATUS_MAP[source.process] || '未知'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{source.createAt || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 pl-4">
                              <div className="w-0.5 h-4 bg-purple-300 rounded"></div>
                              <Link
                                href={`/admin/tajy/${source.tajyId}`}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="查看"
                              >
                                <Eye size={14} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
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

      {/* AI 合并弹窗 */}
      {mergeDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* 弹窗标题 */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-800">AI 合并生成新提案</h2>
                </div>
                <button
                  onClick={() => setMergeDialog({ open: false, loading: false, selectedProposals: [], result: null, editingResult: null })}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {mergeDialog.loading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 size={32} className="text-purple-600 animate-spin" />
                  <p className="text-gray-600">AI 正在分析并生成内容...</p>
                </div>
              ) : mergeDialog.result && (
                <div className="space-y-4">
                  {/* 源提案列表 */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">选择的提案 ({mergeDialog.selectedProposals.length})</h3>
                    <div className="flex flex-wrap gap-2">
                      {mergeDialog.selectedProposals.map((p) => (
                        <button
                          key={p.tajyId}
                          onClick={() => openDetailDialog(p)}
                          className="group flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 rounded-lg text-sm transition-colors"
                          title="点击查看详情"
                        >
                          <span className="font-mono">TY{String(p.tajyId).padStart(4, '0')}</span>
                          <span className="max-w-[150px] truncate">{p.title}</span>
                          <Eye size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI 生成的结果 - 可编辑 */}
                  {mergeDialog.editingResult && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">合并后的提案标题</label>
                        <input
                          type="text"
                          value={mergeDialog.editingResult.title}
                          onChange={(e) => setMergeDialog(prev => ({
                            ...prev,
                            editingResult: { ...prev.editingResult!, title: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">案由（合并后的理由说明）</label>
                        <textarea
                          value={mergeDialog.editingResult.reason}
                          onChange={(e) => setMergeDialog(prev => ({
                            ...prev,
                            editingResult: { ...prev.editingResult!, reason: e.target.value }
                          }))}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">建议（合并后的改进建议）</label>
                        <textarea
                          value={mergeDialog.editingResult.suggest}
                          onChange={(e) => setMergeDialog(prev => ({
                            ...prev,
                            editingResult: { ...prev.editingResult!, suggest: e.target.value }
                          }))}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">主办部门</label>
                        <input
                          type="text"
                          value={mergeDialog.editingResult.management}
                          onChange={(e) => setMergeDialog(prev => ({
                            ...prev,
                            editingResult: { ...prev.editingResult!, management: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                        提示：确认后将生成新的提案建议，可在列表中编辑审核后再转为正式提案
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 弹窗底部按钮 */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setMergeDialog({ open: false, loading: false, selectedProposals: [], result: null, editingResult: null })}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmMerge}
                disabled={mergeDialog.loading || isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(mergeDialog.loading || isSubmitting) ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                生成提案建议
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提案详情弹窗 */}
      {detailDialog.open && detailDialog.proposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* 弹窗标题 */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Eye size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">提案详情</h2>
                    <p className="text-sm text-gray-500">
                      TY{String(detailDialog.proposal.tajyId).padStart(4, '0')} · {getStatusBadge(detailDialog.proposal.process)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailDialog({ open: false, proposal: null })}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-500">提案人:</span>
                  <span className="font-medium">{detailDialog.proposal.name || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="text-gray-500">部门:</span>
                  <span className="font-medium truncate">{detailDialog.proposal.depart || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">提交:</span>
                  <span className="font-medium">{detailDialog.proposal.createAt?.split(' ')[0] || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">类型:</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {PROPOSAL_TYPE_MAP[detailDialog.proposal.type] || '其他'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* 标题 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">提案标题</h3>
                  <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{detailDialog.proposal.title}</p>
                </div>

                {/* 简介 */}
                {detailDialog.proposal.brief && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">提案简介</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap">{detailDialog.proposal.brief}</p>
                  </div>
                )}

                {/* 现状分析 */}
                {detailDialog.proposal.analysis && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">现状分析</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap">{detailDialog.proposal.analysis}</p>
                  </div>
                )}

                {/* 改进建议 */}
                {detailDialog.proposal.suggest && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">改进建议</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap">{detailDialog.proposal.suggest}</p>
                  </div>
                )}

                {/* 职能部门 */}
                {detailDialog.proposal.management && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">职能部门</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl">{detailDialog.proposal.management}</p>
                  </div>
                )}

                {/* 内容 */}
                {detailDialog.proposal.context && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">详细内容</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap max-h-40 overflow-y-auto">{detailDialog.proposal.context}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="p-6 border-t border-gray-100 flex justify-between">
              <Link
                href={`/admin/tajy/${detailDialog.proposal.tajyId}`}
                onClick={() => setDetailDialog({ open: false, proposal: null })}
                className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Edit size={18} />
                编辑提案
              </Link>
              <button
                onClick={() => setDetailDialog({ open: false, proposal: null })}
                className="px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] hover:shadow-lg text-white rounded-xl transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI转正式提案弹窗 */}
      {convertDialog.open && convertDialog.sourceProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* 弹窗标题 */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Wand2 size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">AI 转正式提案</h2>
                    <p className="text-sm text-gray-500">
                      TY{String(convertDialog.sourceProposal.tajyId).padStart(4, '0')} · {convertDialog.sourceProposal.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConvertDialog({ open: false, loading: false, sourceProposal: null, result: null, editingResult: null })}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {convertDialog.loading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 size={32} className="text-purple-600 animate-spin" />
                  <p className="text-gray-600">AI 正在分析提案建议...</p>
                  <p className="text-sm text-gray-400">正在生成正式提案的案由、建议和主办部门</p>
                </div>
              ) : convertDialog.editingResult && (
                <div className="space-y-4">
                  {/* 源提案信息 - 可点击预览 */}
                  <div
                    onClick={() => setShowSourcePreview(true)}
                    className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all border border-purple-200 animate-pulse-slow group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Sparkles size={14} className="text-purple-600" />
                          来源提案建议
                          <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            点击查看详情
                          </span>
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded">TY{String(convertDialog.sourceProposal.tajyId).padStart(4, '0')}</span>
                          <span>·</span>
                          <span className="truncate max-w-[300px] font-medium">{convertDialog.sourceProposal.title}</span>
                        </div>
                      </div>
                      <Eye size={18} className="text-purple-600 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                  {/* AI 生成的结果 - 可编辑 */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">正式提案标题</label>
                      <input
                        type="text"
                        value={convertDialog.editingResult.title}
                        onChange={(e) => setConvertDialog(prev => ({
                          ...prev,
                          editingResult: { ...prev.editingResult!, title: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">案由</label>
                      <textarea
                        value={convertDialog.editingResult.reason}
                        onChange={(e) => setConvertDialog(prev => ({
                          ...prev,
                          editingResult: { ...prev.editingResult!, reason: e.target.value }
                        }))}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        placeholder="说明为什么要立案，包含必要性和紧迫性"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">建议</label>
                      <textarea
                        value={convertDialog.editingResult.suggest}
                        onChange={(e) => setConvertDialog(prev => ({
                          ...prev,
                          editingResult: { ...prev.editingResult!, suggest: e.target.value }
                        }))}
                        rows={5}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        placeholder="用数字编号列出具体可操作的建议"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">主办部门</label>
                      <input
                        type="text"
                        value={convertDialog.editingResult.management}
                        onChange={(e) => setConvertDialog(prev => ({
                          ...prev,
                          editingResult: { ...prev.editingResult!, management: e.target.value }
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div className="p-3 bg-purple-50 rounded-xl text-sm text-purple-700 border border-purple-100">
                      <span className="font-medium">提示：</span>确认后将生成正式提案，原提案建议将被标记为"已转换为正式提案"并置灰，但不会被删除。
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部按钮 */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setConvertDialog({ open: false, loading: false, sourceProposal: null, result: null, editingResult: null })}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmConvert}
                disabled={convertDialog.loading || isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(convertDialog.loading || isSubmitting) ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                确认转换
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 来源提案预览弹窗 */}
      {showSourcePreview && convertDialog.sourceProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            {/* 弹窗标题 */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">来源提案建议详情</h2>
                    <p className="text-sm text-gray-500">
                      TY{String(convertDialog.sourceProposal.tajyId).padStart(4, '0')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSourcePreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-500">提案人:</span>
                  <span className="font-medium">{convertDialog.sourceProposal.name || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="text-gray-500">部门:</span>
                  <span className="font-medium truncate">{convertDialog.sourceProposal.depart || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">提交:</span>
                  <span className="font-medium">{convertDialog.sourceProposal.createAt?.split(' ')[0] || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">类型:</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {PROPOSAL_TYPE_MAP[convertDialog.sourceProposal.type] || '其他'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* 标题 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">提案标题</h3>
                  <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{convertDialog.sourceProposal.title}</p>
                </div>

                {/* 简介 */}
                {convertDialog.sourceProposal.brief && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">提案简介</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap">{convertDialog.sourceProposal.brief}</p>
                  </div>
                )}

                {/* 现状分析 */}
                {convertDialog.sourceProposal.analysis && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">现状分析</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap">{convertDialog.sourceProposal.analysis}</p>
                  </div>
                )}

                {/* 改进建议 */}
                {convertDialog.sourceProposal.suggest && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">改进建议</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap">{convertDialog.sourceProposal.suggest}</p>
                  </div>
                )}

                {/* 职能部门 */}
                {convertDialog.sourceProposal.management && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">职能部门</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl">{convertDialog.sourceProposal.management}</p>
                  </div>
                )}

                {/* 内容 */}
                {convertDialog.sourceProposal.context && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">详细内容</h3>
                    <p className="text-gray-600 bg-gray-50 px-4 py-3 rounded-xl whitespace-pre-wrap max-h-40 overflow-y-auto">{convertDialog.sourceProposal.context}</p>
                  </div>
                )}

                {/* 附议人 */}
                {convertDialog.sourceProposal.fyr && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">附议人</h3>
                    <div className="flex flex-wrap gap-2">
                      {convertDialog.sourceProposal.fyr.split('，').filter(f => f.trim()).map((endorser, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm"
                        >
                          {endorser}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSourcePreview(false)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg text-white rounded-xl transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发送回复弹窗 */}
      {replyDialog.open && replyDialog.proposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 弹窗标题 */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Bell size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">发送回复</h2>
                    <p className="text-sm text-gray-500">
                      TY{String(replyDialog.proposal.tajyId).padStart(4, '0')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeReplyDialog}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 提案信息 - 与来源提案预览弹窗样式一致 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-500">提案人:</span>
                  <span className="font-medium">{replyDialog.proposal.name || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="text-gray-500">部门:</span>
                  <span className="font-medium truncate">{replyDialog.proposal.depart || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-500">提交:</span>
                  <span className="font-medium">{replyDialog.proposal.createAt?.split(' ')[0] || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">类型:</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {PROPOSAL_TYPE_MAP[replyDialog.proposal.type] || '其他'}
                  </span>
                </div>
              </div>

              {/* 提案标题 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">提案标题</h3>
                <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{replyDialog.proposal.title}</p>
              </div>

              {/* 编辑表单 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 左侧表单 */}
                <div className="space-y-4">
                  {/* 回复部门 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      回复部门 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={replyDialog.formData.replyDepartment}
                      onChange={(e) => setReplyDialog(prev => ({
                        ...prev,
                        formData: { ...prev.formData, replyDepartment: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="请输入回复部门名称"
                    />
                  </div>

                  {/* 处理意见 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      处理意见 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={replyDialog.formData.handleOpinion}
                      onChange={(e) => setReplyDialog(prev => ({
                        ...prev,
                        formData: { ...prev.formData, handleOpinion: e.target.value }
                      }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      placeholder="请输入处理意见"
                    />
                  </div>
                </div>

                {/* 右侧表单 */}
                <div className="space-y-4">
                  {/* 具体回复 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      具体回复 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={replyDialog.formData.detailReply}
                      onChange={(e) => setReplyDialog(prev => ({
                        ...prev,
                        formData: { ...prev.formData, detailReply: e.target.value }
                      }))}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      placeholder="请输入具体回复内容"
                    />
                  </div>

                  {/* 发送部门/机构 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      发送部门/机构
                    </label>
                    <input
                      type="text"
                      value={replyDialog.formData.departmentName}
                      onChange={(e) => setReplyDialog(prev => ({
                        ...prev,
                        formData: { ...prev.formData, departmentName: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="请输入发送部门名称"
                    />
                  </div>
                </div>
              </div>

              {/* 实时预览 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Eye size={16} className="text-amber-500" />
                  回复预览
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                    {generateReplyContent()}
                  </pre>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 border border-blue-100">
                <span className="font-medium">提示：</span>回复将通过站内信和企业微信同时发送给提案人。
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={closeReplyDialog}
                disabled={replyDialog.loading}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={sendReply}
                disabled={replyDialog.loading || isSubmitting || !replyDialog.formData.replyDepartment || !replyDialog.formData.detailReply}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:shadow-lg text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replyDialog.loading || isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Bell size={18} />
                    发送回复
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
