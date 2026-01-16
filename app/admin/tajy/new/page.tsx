'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, CheckCircle } from 'lucide-react';
import { PROPOSAL_TYPE_MAP, PROPOSAL_PROCESS_STATUS_MAP } from '@/types';

export default function NewTajyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    brief: '',
    analysis: '',
    suggest: '',
    description: '',
    type: 1,
    process: 0,
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入提案标题');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/tajy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        alert('创建成功');
        router.push('/admin/tajy');
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
            href="/admin/tajy"
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">新建提案</h1>
            <p className="text-gray-500 mt-1">创建新的提案</p>
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

          {/* Brief */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">提案简介</label>
            <textarea
              value={formData.brief}
              onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
              placeholder="请输入提案简介"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Analysis */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">现状分析</label>
            <textarea
              value={formData.analysis}
              onChange={(e) => setFormData({ ...formData, analysis: e.target.value })}
              placeholder="请输入现状分析"
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Suggest */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">改进建议</label>
            <textarea
              value={formData.suggest}
              onChange={(e) => setFormData({ ...formData, suggest: e.target.value })}
              placeholder="请输入改进建议"
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-medium text-gray-500 mb-2">处理说明</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入处理说明"
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Type */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">提案类型</h3>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
            >
              {Object.entries(PROPOSAL_TYPE_MAP).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">处理状态</h3>
            <div className="space-y-2">
              {Object.entries(PROPOSAL_PROCESS_STATUS_MAP).map(([key, value]) => (
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
              href="/admin/tajy"
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
