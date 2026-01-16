'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, CheckCircle, Clock, X, Users } from 'lucide-react';
import { FormalProposal, FORMAL_PROPOSAL_PROCESS_MAP } from '@/types';

export default function AdminZstaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<FormalProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProposalDetail();
  }, [params.id]);

  const fetchProposalDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/formal-proposals/${params.id}`, {
        cache: 'no-store',
      });
      const json = await res.json();

      if (json.success && json.data) {
        setProposal(json.data);
      } else {
        setError('提案不存在');
      }
    } catch (error) {
      console.error('Error fetching proposal detail:', error);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!proposal) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/zsta/${proposal.zstaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal),
      });
      const json = await res.json();

      if (json.success) {
        router.push('/admin/zsta');
      } else {
        alert(json.error || '保存失败');
        setSaving(false);
      }
    } catch (error) {
      alert('保存失败');
      setSaving(false);
    }
  };

  // 只更新本地状态，不发送请求
  const handleUpdateProcess = (process: number) => {
    if (!proposal) return;
    setProposal({ ...proposal, process });
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

  if (error || !proposal) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">{error || '提案不存在'}</p>
        <Link
          href="/admin/zsta"
          className="inline-flex items-center gap-2 text-[#1779DC] hover:underline"
        >
          <ArrowLeft size={18} />
          返回列表
        </Link>
      </div>
    );
  }

  const statusBadge = (process: number | undefined | null) => {
    // 处理无效值：null、undefined、或不在映射中的值都默认为"未处理"
    const validProcess = (process !== null && process !== undefined && FORMAL_PROPOSAL_PROCESS_MAP[process])
      ? process
      : 0;
    const status = FORMAL_PROPOSAL_PROCESS_MAP[validProcess];
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
        {status}
      </span>
    );
  };

  // 格式化正式提案编号：年份 + ZSTA + zstaId (3位)
  const formatProposalCode = () => {
    const year = proposal.createAt ? new Date(new Date(proposal.createAt).getTime() + (8 * 60 * 60 * 1000)).getFullYear() : new Date().getFullYear();
    return `${year}ZSTA${String(proposal.zstaId).padStart(3, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/zsta"
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">正式提案详情</h1>
            <p className="text-gray-500 mt-1">
              {formatProposalCode()} · {statusBadge(proposal.process)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/formal-proposals/${proposal.zstaId}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors"
          >
            查看前台
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] hover:shadow-lg text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            保存
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">提案标题</label>
            <input
              type="text"
              value={proposal.title}
              onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            />
          </div>

          {/* 主办单位 - Main Content */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">主办单位</label>
            <input
              type="text"
              value={proposal.management || ''}
              onChange={(e) => setProposal({ ...proposal, management: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
              placeholder="请输入主办单位"
            />
          </div>

          {/* Reason */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">提案理由</label>
            <textarea
              value={proposal.reason || ''}
              onChange={(e) => setProposal({ ...proposal, reason: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Suggest */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">具体建议</label>
            <textarea
              value={proposal.suggest || ''}
              onChange={(e) => setProposal({ ...proposal, suggest: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Reply */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">办理回复</label>
            <textarea
              value={proposal.reply || ''}
              onChange={(e) => setProposal({ ...proposal, reply: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">修改处理状态</h3>
            <div className="space-y-3">
              {[
                { key: 0, label: '未处理' },
                {key: 1, label: '正在处理' },
                {key: 2, label: '处理完毕' },
              ].map(({ key, label }) => {
                const isActive = (proposal.process ?? 0) === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleUpdateProcess(key)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white border-transparent shadow-md scale-[1.02]'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:scale-[1.01] hover:shadow-sm'
                    }`}
                  >
                    <span className="font-medium flex items-center gap-2">
                      {label}
                    </span>
                    {isActive && <CheckCircle size={18} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Management */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">主办单位</h3>
            <input
              type="text"
              value={proposal.management || ''}
              onChange={(e) => setProposal({ ...proposal, management: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
              placeholder="请输入主办单位"
            />
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">提交信息</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">提案编号</span>
                <span className="font-mono text-gray-800">{formatProposalCode()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">提交时间</span>
                <span className="text-gray-800">{proposal.createAt?.split(' ')[0]}</span>
              </div>
            </div>
          </div>

          {/* 附议人信息 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-[#1779DC]" />
              附议人
            </h3>
            {proposal.allEndorsers ? (
              <div className="space-y-2">
                {proposal.allEndorsers.split('，').filter(f => f.trim()).map((endorser, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg text-sm text-gray-700"
                  >
                    <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <span>{endorser.replace(/\([^)]+\)/, '').trim()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">暂无附议人</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
