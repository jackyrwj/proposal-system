'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, CheckCircle } from 'lucide-react';
import { FORMAL_PROPOSAL_PROCESS_MAP } from '@/types';

export default function NewZstaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    reason: '',
    suggest: '',
    management: '',
    process: 0,
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入提案标题');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/zsta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        alert('创建成功');
        router.push('/admin/zsta');
      } else {
        alert(json.error || '创建失败');
      }
    } catch (error) {
      alert('创建失败');
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-800">新建正式提案</h1>
            <p className="text-gray-500 mt-1">创建新的正式提案</p>
          </div>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">
              提案标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入提案标题"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            />
          </div>

          {/* Reason */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">提案理由（案由）</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="请输入提案理由/案由"
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Suggest */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">具体建议</label>
            <textarea
              value={formData.suggest}
              onChange={(e) => setFormData({ ...formData, suggest: e.target.value })}
              placeholder="请输入具体建议"
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Management */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">主办单位</h3>
            <input
              type="text"
              value={formData.management}
              onChange={(e) => setFormData({ ...formData, management: e.target.value })}
              placeholder="请输入主办单位"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            />
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">处理状态</h3>
            <div className="space-y-2">
              {Object.entries(FORMAL_PROPOSAL_PROCESS_MAP).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setFormData({ ...formData, process: parseInt(key) })}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                    formData.process === parseInt(key)
                      ? 'bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="font-medium">{value}</span>
                  {formData.process === parseInt(key) && <CheckCircle size={18} />}
                </button>
              ))}
            </div>
          </div>

          {/* Back Button */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <Link
              href="/admin/zsta"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              返回列表
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
