'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, Building2, FileText, MessageSquare, ArrowLeft, Home, Loader2, CheckCircle, Clock, Paperclip, Printer } from 'lucide-react';
import { FormalProposal, PROCESS_STATUS_MAP, FORMAL_PROPOSAL_PROCESS_MAP } from '@/types';
import { ProgressBar, DEFAULT_FLOW_NODES, getStepByProcess } from '@/components/ProgressBar';

export default function FormalProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<FormalProposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProposalDetail() {
      setLoading(true);
      try {
        // 获取提案详情
        const proposalRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/formal-proposals/${params.id}`, {
          cache: 'no-store',
        });
        const json = await proposalRes.json();

        if (json.success && json.data) {
          setProposal(json.data);
        }
      } catch (error) {
        console.error('Error fetching formal proposal detail:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProposalDetail();
  }, [params.id]);

  const getStatusBadge = (process: number | undefined | null) => {
    const validProcess = (process !== null && process !== undefined) ? process : 0;
    const status = FORMAL_PROPOSAL_PROCESS_MAP[validProcess] || '未知';
    const statusMap: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
      '未处理': {
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-400',
        icon: <Clock size={18} />
      },
      '正在处理': {
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-400',
        icon: <Clock size={18} />
      },
      '处理完毕': {
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-400',
        icon: <CheckCircle size={18} />
      },
    };
    const config = statusMap[status] || {
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      icon: <Clock size={18} />
    };
    return (
      <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-base border-2 ${config.color} ${config.bgColor} ${config.borderColor} shadow-sm`}>
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
          <Link href="/formal-proposals" className="text-[#1779DC] hover:underline">
            返回正式提案列表
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
        <Link href="/formal-proposals" className="hover:text-[#1779DC] transition-colors">
          正式提案
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
          <ProgressBar
            nodes={DEFAULT_FLOW_NODES.zsta}
            currentStep={getStepByProcess(proposal.process ?? 0, 'zsta')}
            proposalType="zsta"
            size="md"
            showAllNodes={true}
          />
        </div>

        {/* 正式提案详情 */}
        <article className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 标题区域 */}
          <div className="p-8 pb-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-800 flex-1">{proposal.title}</h1>
              {getStatusBadge(proposal.process)}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span className="font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {formatProposalCode(proposal)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                {proposal.createAt?.split(' ')[0]}
              </div>
              {proposal.management && (
                <div className="flex items-center gap-1">
                  <Building2 size={16} />
                  {proposal.management}
                </div>
              )}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-8 space-y-8">
            {/* 职能部门 */}
            {proposal.management && (
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-medium flex items-center gap-2">
                  <Building2 size={16} />
                  {proposal.management}
                </span>
              </div>
            )}

            {/* 案由 */}
            {proposal.reason && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText size={20} className="text-[#1779DC]" />
                  案由
                </h3>
                <div
                  className="prose prose-blue max-w-none text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-xl whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: proposal.reason.split('\n').map(line => `<p style="text-indent: 2em; margin-bottom: 0.5em">${line || '&nbsp;'}</p>`).join('')
                  }}
                />
              </div>
            )}

            {/* 建议 */}
            {proposal.suggest && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <MessageSquare size={20} className="text-indigo-500" />
                  建议
                </h3>
                <div
                  className="prose prose-indigo max-w-none text-gray-700 leading-relaxed bg-indigo-50 p-4 rounded-xl whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: proposal.suggest.split('\n').map(line => `<p style="text-indent: 2em; margin-bottom: 0.5em">${line || '&nbsp;'}</p>`).join('')
                  }}
                />
              </div>
            )}

            {/* 答复 */}
            {proposal.reply && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <MessageSquare size={20} className="text-green-500" />
                  答复意见
                </h3>
                <div
                  className="prose prose-green max-w-none text-gray-700 leading-relaxed bg-green-50 p-4 rounded-xl border-l-4 border-green-500 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: proposal.reply.split('\n').map(line => `<p style="text-indent: 2em; margin-bottom: 0.5em">${line || '&nbsp;'}</p>`).join('')
                  }}
                />
              </div>
            )}

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
          </div>
        </article>

        {/* 相关操作 */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 bottom-actions">
          <button
            onClick={() => window.open(`/print/zsta/${params.id}`, '_blank')}
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
