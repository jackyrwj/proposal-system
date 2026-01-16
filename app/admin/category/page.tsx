'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Loader2,
  FolderTree,
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/categories`);
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddForm(false);
        setNewName('');
        setNewDesc('');
        fetchCategories();
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleUpdate = async (id: number) => {
    const category = categories.find(c => c.id === id);
    if (!category || !category.name.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          isActive: category.isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingId(null);
        fetchCategories();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个类别吗？')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/categories/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleToggleActive = async (id: number) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          isActive: !category.isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Error toggling category:', error);
    }
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
            <FolderTree size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">提案类别管理</h1>
            <p className="text-gray-500 text-sm">管理提案的分类类型</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          <Plus size={18} />
          添加类别
        </button>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 animate-slide-down">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新类别</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">类别名称</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入类别名称"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入描述"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-6 py-3 bg-[#1779DC] text-white rounded-xl hover:bg-[#2861AE] transition-colors font-medium"
              >
                确定
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewName('');
                  setNewDesc('');
                }}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 类别列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">类别名称</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">描述</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">创建时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600">{category.id}</td>
                <td className="px-6 py-4">
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => {
                        setCategories(categories.map(c =>
                          c.id === category.id ? { ...c, name: e.target.value } : c
                        ));
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-40"
                    />
                  ) : (
                    <span className="font-medium text-gray-800">{category.name}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={category.description || ''}
                      onChange={(e) => {
                        setCategories(categories.map(c =>
                          c.id === category.id ? { ...c, description: e.target.value } : c
                        ));
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-60"
                    />
                  ) : (
                    <span className="text-sm text-gray-600">{category.description || '-'}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(category.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      category.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {category.isActive ? '启用' : '禁用'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {category.createdAt?.split(' ')[0] || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === category.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(category.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="保存"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="取消"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingId(category.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  暂无类别数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
