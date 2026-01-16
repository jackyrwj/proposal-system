'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X, Loader2, CheckCircle, Calendar, User, Building2, Clock, Users, Bell, Eye, Paperclip, Download } from 'lucide-react';
import { Proposal, PROCESS_STATUS_MAP, PROPOSAL_TYPE_MAP, PROPOSAL_PROCESS_STATUS_MAP } from '@/types';

export default function AdminTajyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 回复弹窗状态
  const [replyDialog, setReplyDialog] = useState<{
    open: boolean;
    loading: boolean;
    formData: {
      replyDepartment: string;
      handleOpinion: string;
      detailReply: string;
      departmentName: string;
    };
  }>({
    open: false,
    loading: false,
    formData: {
      replyDepartment: '',
      handleOpinion: '',
      detailReply: '',
      departmentName: '校工会',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProposalDetail();
  }, [params.id]);

  const fetchProposalDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/proposals/${params.id}`, {
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
      const res = await fetch(`/api/admin/tajy/${proposal.tajyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal),
      });
      const json = await res.json();

      if (json.success) {
        router.push('/admin/tajy');
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

  // 打开发送回复弹窗
  const openReplyDialog = () => {
    if (!proposal) return;
    const statusMap: Record<number, string> = {
      0: '未审核',
      1: '已立案',
      2: '不立案',
      3: '处理中',
    };
    setReplyDialog({
      open: true,
      loading: false,
      formData: {
        replyDepartment: proposal.management || '',
        handleOpinion: statusMap[proposal.process] || '未审核',
        detailReply: proposal.description || '',
        departmentName: '校工会',
      },
    });
  };

  // 关闭回复弹窗
  const closeReplyDialog = () => {
    setReplyDialog({
      open: false,
      loading: false,
      formData: {
        replyDepartment: '',
        handleOpinion: '',
        detailReply: '',
        departmentName: '校工会',
      },
    });
  };

  // 生成预览内容
  const generateReplyContent = () => {
    if (!proposal) return '';
    const { formData } = replyDialog;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    return `尊敬的 ${proposal?.name || ''} 老师：

您好！关于您提交的提案《${proposal?.title || ''}》，相关部门回复如下：

处理状态：${formData.handleOpinion || '未审核'}
主办部门：${formData.replyDepartment || '待填写'}

回复内容：
${formData.detailReply || '待填写'}

反馈说明：满意请回复"收到"，如有其他意见请直接回复本邮件。

感谢您的支持！
${formData.departmentName} ${year}年${month}月${day}日`;
  };

  // 发送回复
  const sendReply = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setReplyDialog(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/admin/tajy/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal?.tajyId,
          ...replyDialog.formData,
          replyContent: generateReplyContent(),
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert('回复已发送！');
        closeReplyDialog();
      } else {
        alert(json.error || '发送失败');
        setReplyDialog(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      alert('发送失败');
      setReplyDialog(prev => ({ ...prev, loading: false }));
    } finally {
      setIsSubmitting(false);
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

  if (error || !proposal) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">{error || '提案不存在'}</p>
        <Link
          href="/admin/tajy"
          className="inline-flex items-center gap-2 text-[#1779DC] hover:underline"
        >
          <ArrowLeft size={18} />
          返回列表
        </Link>
      </div>
    );
  }

  const statusBadge = (process: number) => {
    const status = PROPOSAL_PROCESS_STATUS_MAP[process] || '未知';
    const statusMap: Record<string, string> = {
      '未审核': 'bg-gray-100 text-gray-700 border-gray-200',
      '已立案': 'bg-green-100 text-green-700 border-green-200',
      '不立案': 'bg-red-100 text-red-700 border-red-200',
      '处理中': 'bg-amber-100 text-amber-700 border-amber-200',
    };
    const color = statusMap[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium border ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/tajy"
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">提案详情</h1>
            <p className="text-gray-500 mt-1">
              TY{String(proposal.tajyId).padStart(4, '0')} · {statusBadge(proposal.process)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">基本信息</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">提案编号</label>
                <p className="text-gray-800 font-mono">TY{String(proposal.tajyId).padStart(4, '0')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">提交时间</label>
                <p className="text-gray-800">{proposal.createAt?.split(' ')[0]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">提案人</label>
                <p className="text-gray-800">{proposal.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">所属部门</label>
                <p className="text-gray-800">{proposal.depart || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">主办部门</label>
                <p className="text-gray-800">{proposal.management || '-'}</p>
              </div>
            </div>
          </div>

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

          {/* Brief */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">提案简介</label>
            <textarea
              value={proposal.brief || ''}
              onChange={(e) => setProposal({ ...proposal, brief: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Analysis */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">现状分析</label>
            <textarea
              value={proposal.analysis || ''}
              onChange={(e) => setProposal({ ...proposal, analysis: e.target.value })}
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Suggest */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">改进建议</label>
            <textarea
              value={proposal.suggest || ''}
              onChange={(e) => setProposal({ ...proposal, suggest: e.target.value })}
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">处理说明</label>
            <textarea
              value={proposal.description || ''}
              onChange={(e) => setProposal({ ...proposal, description: e.target.value })}
              rows={5}
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
                { key: 0, label: '未审核' },
                {key: 3, label: '处理中' },
                {key: 1, label: '已立案' },
                {key: 2, label: '不立案' },
              ].map(({ key, label }) => {
                const isActive = proposal.process === key;
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

          {/* 发送回复 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">发送回复</h3>
            <p className="text-sm text-gray-500 mb-4">向提案人发送处理结果回复</p>
            <button
              onClick={openReplyDialog}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:shadow-lg text-white rounded-xl transition-all"
            >
              <Bell size={18} />
              发送提案人
            </button>
          </div>

          {/* Type */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">提案类型</h3>
            <select
              value={proposal.type}
              onChange={(e) => setProposal({ ...proposal, type: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            >
              {Object.entries(PROPOSAL_TYPE_MAP).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Info */}
          {(proposal.phone || proposal.mail) && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">联系信息</h3>
              <div className="space-y-3 text-sm">
                {proposal.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">电话:</span>
                    <span>{proposal.sfnm === 1 ? '***' : proposal.phone}</span>
                  </div>
                )}
                {proposal.mail && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">邮箱:</span>
                    <span>{proposal.sfnm === 1 ? '***' : proposal.mail}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 附议人信息 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-[#1779DC]" />
              附议人
            </h3>
            {proposal.fyr ? (
              <div className="space-y-2">
                {proposal.fyr.split('，').filter(f => f.trim()).map((endorser, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg text-sm text-gray-700"
                  >
                    <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">
                      {endorser.match(/\(([^)]+)\)/)?.[1]?.slice(-2) || idx + 1}
                    </span>
                    <span>{endorser.replace(/\([^)]+\)/, '').trim()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">暂无附议人</p>
            )}
          </div>

          {/* 附件 */}
          {proposal.attachment && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Paperclip size={18} className="text-[#1779DC]" />
                附件
              </h3>
              <a
                href={proposal.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
              >
                <Download size={16} />
                下载附件
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">快捷操作</h3>
            <div className="space-y-2">
              <Link
                href={`/proposals/${proposal.tajyId}`}
                target="_blank"
                className="block w-full text-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
              >
                查看前台页面
              </Link>
              <button
                onClick={() => {
                  if (confirm('确定要删除这条提案吗？')) {
                    // Handle delete
                  }
                }}
                className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
              >
                删除提案
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 回复弹窗 */}
      {replyDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <Bell size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">发送回复给提案人</h2>
                  <p className="text-sm text-gray-500">提案：TY{String(proposal?.tajyId).padStart(4, '0')} - {proposal?.title}</p>
                </div>
              </div>
              <button
                onClick={closeReplyDialog}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 左侧：编辑表单 */}
                <div className="space-y-5">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Bell size={18} className="text-amber-600" />
                    编辑内容
                  </h3>
                  {/* 回复部门 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      回复部门 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={replyDialog.formData.replyDepartment}
                      onChange={(e) => setReplyDialog({
                        ...replyDialog,
                        formData: { ...replyDialog.formData, replyDepartment: e.target.value }
                      })}
                      placeholder="如：后勤处"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* 处理状态 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      处理状态
                    </label>
                    <input
                      type="text"
                      value={replyDialog.formData.handleOpinion}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  {/* 具体回复 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      具体回复 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={replyDialog.formData.detailReply}
                      onChange={(e) => setReplyDialog({
                        ...replyDialog,
                        formData: { ...replyDialog.formData, detailReply: e.target.value }
                      })}
                      placeholder="详细回复内容，将作为邮件正文发送给提案人"
                      rows={7}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {/* 部门名称 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      落款部门
                    </label>
                    <input
                      type="text"
                      value={replyDialog.formData.departmentName}
                      onChange={(e) => setReplyDialog({
                        ...replyDialog,
                        formData: { ...replyDialog.formData, departmentName: e.target.value }
                      })}
                      placeholder="如：校工会"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* 右侧：预览 */}
                <div className="bg-gray-50 rounded-xl p-5 flex flex-col">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <Eye size={18} className="text-amber-600" />
                    预览邮件内容
                  </h3>
                  <div className="flex-1 bg-white rounded-lg p-5 whitespace-pre-wrap text-gray-700 leading-relaxed border border-gray-200 overflow-y-auto text-sm">
                    {generateReplyContent()}
                  </div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 gap-3">
              <button
                onClick={closeReplyDialog}
                disabled={replyDialog.loading}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={sendReply}
                disabled={replyDialog.loading || !replyDialog.formData.replyDepartment || !replyDialog.formData.detailReply}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:shadow-lg text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replyDialog.loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Bell size={18} />
                    发送
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
