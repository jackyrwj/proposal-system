'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, Building2, FileText, Lightbulb, ArrowLeft, Home, Loader2, Send, Clock, CheckCircle, Printer, Users, Paperclip, Users as UsersIcon, X, UserPlus } from 'lucide-react';
import { Proposal, PROCESS_STATUS_MAP, PROPOSAL_TYPE_MAP, PROPOSAL_PROCESS_STATUS_MAP } from '@/types';
import { ProgressBar, DEFAULT_FLOW_NODES, getStepByProcess, isRejectedStatus } from '@/components/ProgressBar';

interface CurrentUser {
  id: string;
  name: string;
  depart?: string;
  type: 'individual' | 'department';
}

// 从 localStorage 获取用户信息
function getUserFromStorage(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// 检查用户是否已附议
function checkIfEndorsed(fyr: string | null, userId: string): boolean {
  if (!fyr) return false;
  const endorsements = fyr.split('，').filter(f => f.trim());
  return endorsements.some(e => e.includes(`(${userId})`));
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [pendingEndorsement, setPendingEndorsement] = useState<{ id: number; status: 'pending' | 'accepted' | 'rejected' } | null>(null);
  const [endorsing, setEndorsing] = useState(false);
  const [showEndorseSuccess, setShowEndorseSuccess] = useState(false);
  const [showRejectSuccess, setShowRejectSuccess] = useState(false);
  const [enableSign, setEnableSign] = useState<number>(1); // 默认开启附议功能

  useEffect(() => {
    async function fetchProposalDetail() {
      setLoading(true);

      // 获取当前用户信息
      const user = getUserFromStorage();
      setCurrentUser(user);

      try {
        // 并行获取提案详情和首页参数
        const [proposalRes, paramsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/proposals/${params.id}`, {
            cache: 'no-store',
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/public/params`, {
            cache: 'no-store',
          }),
        ]);
        const [json, paramsJson] = await Promise.all([
          proposalRes.json(),
          paramsRes.json(),
        ]);

        // 获取附议功能开关状态（确保是数字类型）
        if (paramsJson.success && paramsJson.data) {
          const rawEnableSign = paramsJson.data.enableSign;
          console.log('enableSign from API:', rawEnableSign, 'type:', typeof rawEnableSign);
          const parsed = typeof rawEnableSign === 'number' ? rawEnableSign : parseInt(rawEnableSign ?? '1');
          console.log('enableSign parsed:', parsed);
          setEnableSign(parsed);
        }

        if (json.success && json.data) {
          setProposal(json.data);
          // 获取待确认的附议邀请状态
          if (json.data.pendingEndorsement) {
            setPendingEndorsement(json.data.pendingEndorsement);
          }
        }
      } catch (error) {
        console.error('Error fetching proposal detail:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProposalDetail();
  }, [params.id]);

  // 附议/取消附议处理函数
  const handleEndorseAction = async (action: 'accept' | 'reject') => {
    if (!currentUser || endorsing) return;

    setEndorsing(true);
    try {
      const res = await fetch(`/api/proposals/${params.id}/endorsements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': encodeURIComponent(JSON.stringify(currentUser)),
        },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();

      if (json.success) {
        // 更新状态
        setPendingEndorsement({ id: pendingEndorsement!.id, status: json.data.status });
        // 刷新提案详情以更新附议人列表
        const proposalRes = await fetch(`/api/proposals/${params.id}`);
        const proposalJson = await proposalRes.json();
        if (proposalJson.success) {
          setProposal(proposalJson.data);
        }
        // 显示成功动画
        if (action === 'accept') {
          setShowEndorseSuccess(true);
          setTimeout(() => setShowEndorseSuccess(false), 2000);
        } else {
          setShowRejectSuccess(true);
          setTimeout(() => setShowRejectSuccess(false), 2000);
        }
      } else {
        alert(json.error || '操作失败');
      }
    } catch (error) {
      console.error('Error endorsing:', error);
      alert('操作失败，请稍后重试');
    } finally {
      setEndorsing(false);
    }
  };

  const getStatusBadge = (process: number) => {
    const status = PROPOSAL_PROCESS_STATUS_MAP[process] || '未知';
    const statusMap: Record<string, { color: string; icon: React.ReactNode; bgColor: string; borderColor: string }> = {
      '未审核': {
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        icon: <Clock size={18} />
      },
      '已立案': {
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-400',
        icon: <CheckCircle size={18} />
      },
      '不立案': {
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-400',
        icon: <X size={18} />
      },
      '处理中': {
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-400',
        icon: <Clock size={18} />
      },
    };
    const config = statusMap[status] || {
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      icon: null
    };
    return (
      <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-base border-2 ${config.color} ${config.bgColor} ${config.borderColor} shadow-sm`}>
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

  if (!proposal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">提案不存在</p>
          <Link href="/proposals" className="text-[#1779DC] hover:underline">
            返回提案列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      {/* 附议成功动画 */}
      {showEndorseSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-scale-in">
            <div className="relative mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500 animate-check-draw" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M4 12 L9 17 L20 5" />
                </svg>
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-green-400 animate-ping" />
            </div>
            <p className="text-xl font-semibold text-gray-800">附议成功！</p>
            <p className="text-gray-500 mt-1">感谢您的参与</p>
          </div>
        </div>
      )}

      {/* 拒绝附议成功动画 */}
      {showRejectSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center animate-scale-in">
            <div className="relative mb-4">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M4 4 L20 20" className="animate-x-draw-1" />
                  <path d="M20 4 L4 20" className="animate-x-draw-2" />
                </svg>
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-800">已拒绝附议</p>
            <p className="text-gray-500 mt-1">您已拒绝此提案的附议邀请</p>
          </div>
        </div>
      )}

      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-[#1779DC] transition-colors flex items-center gap-1">
          <Home size={14} />
          首页
        </Link>
        <span>/</span>
        <Link href="/proposals" className="hover:text-[#1779DC] transition-colors">
          提案建议
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

        {/* 进度条 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {isRejectedStatus(proposal.process, 'tajy') ? (
            // 不立案状态：显示特殊提示
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <X size={24} className="text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">不立案</p>
                <p className="text-sm text-gray-500">该提案经审核后未予立案</p>
              </div>
            </div>
          ) : (
            // 正常流程：显示三个节点的进度条
            <ProgressBar
              nodes={DEFAULT_FLOW_NODES.tajy}
              currentStep={getStepByProcess(proposal.process, 'tajy')}
              proposalType="tajy"
              size="md"
              showAllNodes={true}
            />
          )}
        </div>

        {/* 提案详情 */}
        <article className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 标题区域 */}
          <div className="p-8 pb-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-800 flex-1">{proposal.title}</h1>
              {getStatusBadge(proposal.process)}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span className="font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  TY{String(proposal.tajyId).padStart(4, '0')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                {proposal.createAt || '-'}
              </div>
              {proposal.name && (
                <div className="flex items-center gap-1">
                  <User size={16} />
                  {proposal.name}
                </div>
              )}
              {proposal.depart && (
                <div className="flex items-center gap-1">
                  <Building2 size={16} />
                  {proposal.depart}
                </div>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-8 space-y-8">
            {/* 提案类型标签 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* 个人/集体提案类型 */}
              <span className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 border ${
                proposal.type === 1
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
              }`}>
                {proposal.type === 1 ? <User size={16} /> : <UsersIcon size={16} />}
                {PROPOSAL_TYPE_MAP[proposal.type] || '其他'}
              </span>
              {/* 提案分类 */}
              {proposal.context && (
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-medium flex items-center gap-2">
                  <FileText size={16} />
                  提案分类：{proposal.context}
                </span>
              )}
              {/* 职能部门 */}
              {proposal.management && (
                <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center gap-2">
                  <Building2 size={16} />
                  {proposal.management}
                </span>
              )}
            </div>

            {/* 提案简介 */}
            {proposal.brief && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText size={20} className="text-[#1779DC]" />
                  提案简介
                </h3>
                <div className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl whitespace-pre-wrap">
                  {proposal.brief}
                </div>
              </div>
            )}

            {/* 现状分析 */}
            {proposal.analysis && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Send size={20} className="text-blue-500" />
                  现状分析
                </h3>
                <div
                  className="prose prose-blue max-w-none text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-xl whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: proposal.analysis.split('\n').map(line => `<p style="text-indent: 2em; margin-bottom: 0.5em">${line || '&nbsp;'}</p>`).join('')
                  }}
                />
              </div>
            )}

            {/* 改进建议 */}
            {proposal.suggest && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Lightbulb size={20} className="text-amber-500" />
                  改进建议
                </h3>
                <div
                  className="prose prose-amber max-w-none text-gray-700 leading-relaxed bg-amber-50 p-4 rounded-xl whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: proposal.suggest.split('\n').map(line => `<p style="text-indent: 2em; margin-bottom: 0.5em">${line || '&nbsp;'}</p>`).join('')
                  }}
                />
              </div>
            )}

            {/* 处理说明 */}
            {proposal.description && proposal.description.trim() !== '' && proposal.description !== '无' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-500" />
                  处理说明
                </h3>
                <div
                  className="prose prose-green max-w-none text-gray-700 leading-relaxed bg-green-50 p-4 rounded-xl"
                  dangerouslySetInnerHTML={{ __html: proposal.description }}
                />
              </div>
            )}

            {/* 已署名附议人 - 只显示已确认的附议人 */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Users size={20} className="text-purple-500" />
                已署名附议人
              </h3>
              <div className="text-gray-700 leading-relaxed bg-purple-50 p-4 rounded-xl">
                {proposal.fyr || '暂无附议人'}
              </div>

              {/* 附议邀请状态按钮 */}
              {enableSign === 1 && currentUser && currentUser.type === 'individual' && parseInt(proposal.stuid) !== parseInt(currentUser.id || '0') ? (
                <div className="mt-3">
                  {pendingEndorsement ? (
                    // 有附议邀请
                    pendingEndorsement.status === 'pending' ? (
                      // 待确认：显示确认和拒绝按钮
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEndorseAction('accept')}
                          disabled={endorsing}
                          className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                            showEndorseSuccess ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'
                          } text-white ${endorsing ? 'opacity-70 cursor-wait' : ''}`}
                        >
                          {endorsing ? '处理中...' : showEndorseSuccess ? '已接受' : '确认附议'}
                        </button>
                        <button
                          onClick={() => handleEndorseAction('reject')}
                          disabled={endorsing}
                          className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                            showRejectSuccess ? 'bg-gray-500' : 'bg-gray-400 hover:bg-gray-500'
                          } text-white ${endorsing ? 'opacity-70 cursor-wait' : ''}`}
                        >
                          {endorsing ? '处理中...' : showRejectSuccess ? '已拒绝' : '拒绝'}
                        </button>
                      </div>
                    ) : (
                      // 已处理：显示状态
                      <span className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1 ${
                        pendingEndorsement.status === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        <CheckCircle size={14} />
                        {pendingEndorsement.status === 'accepted' ? '已接受附议' : '已拒绝附议'}
                      </span>
                    )
                  ) : (
                    // 无附议邀请：显示提示（暂未受邀附议此提案）
                    <p className="text-sm text-gray-400">暂未受邀附议此提案</p>
                  )}
                </div>
              ) : enableSign === 1 && currentUser && currentUser.type === 'individual' && parseInt(proposal.stuid) === parseInt(currentUser.id || '0') ? (
                // 提案人自己，显示提示
                <div className="mt-3">
                  <p className="text-sm text-gray-500 italic">无法对自己的提案附议</p>
                </div>
              ) : null}
              {/* 附议功能开启时，个人账户未登录提示 */}
              {enableSign === 1 && !currentUser && (
                <div className="mt-3">
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/proposals/${params.id}`)}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <UserPlus size={16} />
                    登录后附议
                  </Link>
                </div>
              )}
              {/* 附议功能关闭时的提示 */}
              {enableSign === 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 italic">附议功能已关闭</p>
                </div>
              )}
            </div>

            {/* 附件 */}
            {proposal.attachment && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Paperclip size={20} className="text-gray-500" />
                  附件
                </h3>
                <a
                  href={proposal.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                >
                  <Paperclip size={16} />
                  查看附件
                </a>
              </div>
            )}

            {/* 联系信息 */}
            {(proposal.phone || proposal.mail) && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">联系信息</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {proposal.phone && (
                    <span className="flex items-center gap-2">
                      <span className="font-medium">电话:</span>
                      {proposal.sfnm === 1 ? '***' : proposal.phone}
                    </span>
                  )}
                  {proposal.mail && (
                    <span className="flex items-center gap-2">
                      <span className="font-medium">邮箱:</span>
                      {proposal.sfnm === 1 ? '***' : proposal.mail}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* 相关操作 */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 bottom-actions">
          <button
            onClick={() => window.open(`/print/tajy/${params.id}`, '_blank')}
            className="px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
          >
            <Printer size={18} />
            打印
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 border-2 border-[#1779DC] text-[#1779DC] rounded-xl hover:bg-blue-50 transition-all font-medium flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
