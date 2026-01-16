'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Loader2,
  Check,
  X,
  Upload,
  X as XIcon,
  Download,
} from 'lucide-react';

interface AboutWork {
  gytagzId: number;
  name: string;
  title: string;
  context: string;
  attachment: string;
  createat: string;
}

export default function AdminAboutPage() {
  const [items, setItems] = useState<AboutWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    context: '',
    attachment: '',
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/about-work`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      }
    } catch (error) {
      console.error('Error fetching about work items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setFormData(prev => ({ ...prev, attachment: json.url }));
      } else {
        alert('上传失败');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({ ...prev, attachment: '' }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.title.trim() || !formData.context.trim()) {
      alert('请填写完整信息');
      return;
    }

    try {
      if (editingId) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/about-work/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          setEditingId(null);
          fetchItems();
        }
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/about-work`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          setShowAddForm(false);
          fetchItems();
        }
      }
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = (item: AboutWork) => {
    setEditingId(item.gytagzId);
    setFormData({
      name: item.name,
      title: item.title,
      context: item.context,
      attachment: item.attachment,
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条内容吗？')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/about-work/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchItems();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', title: '', context: '', attachment: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleDownload = (e: React.MouseEvent, url: string, filename: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 size={40} className="text-[#1779DC] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl text-white">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">关于提案工作</h1>
            <p className="text-gray-500 text-sm">管理工作相关的通知和公告</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            resetForm();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <Plus size={18} />
          添加内容
        </button>
      </div>

      {/* 添加/编辑表单 */}
      {(showAddForm || editingId) && (
        <div className="bg-white rounded-xl shadow-sm p-6 animate-slide-down">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId ? '编辑内容' : '添加新内容'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">发布单位</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                  placeholder="如：校工会"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                  placeholder="请输入标题"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">附件</label>
              {formData.attachment ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex-1 flex items-center gap-2">
                    <FileText size={18} className="text-[#1779DC]" />
                    <span className="text-sm text-gray-600 truncate max-w-xs">
                      {formData.attachment.split('/').pop()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <XIcon size={18} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    uploading ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-[#1779DC] hover:bg-blue-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={24} className="text-[#1779DC] animate-spin" />
                      <span className="text-sm text-gray-500">上传中...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className="text-gray-400" />
                      <span className="text-sm text-gray-500">点击上传附件</span>
                      <span className="text-xs text-gray-400">支持 PDF、Word、Excel、PPT、压缩包</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
              <textarea
                value={formData.context}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入内容"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-[#1779DC] text-white rounded-xl hover:bg-[#2861AE] transition-colors font-medium"
              >
                {editingId ? '更新' : '添加'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  cancelEdit();
                }}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 内容列表 */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.gytagzId}
            onClick={() => handleEdit(item)}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="text-sm text-gray-500">{item.createat?.split(' ')[0]}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600 whitespace-pre-wrap line-clamp-2">{item.context}</p>
                {item.attachment && (
                  <button
                    onClick={(e) => handleDownload(e, item.attachment, item.attachment.split('/').pop() || '下载')}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Download size={14} />
                    <span className="truncate max-w-xs">{item.attachment.split('/').pop()}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(item);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.gytagzId);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            暂无内容
          </div>
        )}
      </div>
    </div>
  );
}
