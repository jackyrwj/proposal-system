'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  ChevronDown,
} from 'lucide-react';

interface UnionMember {
  id: string;
  name: string;
  unit: string;
  position: string;
  year: string;
  phone: string;
  cardNo: string;
  mail: string;
  isAdmin: number;
}

interface SearchResult {
  cardNo: string;      // 校园卡号 (XYH)
  employeeId: string;  // 职工号 (ZGH)
  name: string;        // 姓名
  unit: string;        // 标准单位名称
  unitCode: string;    // 标准单位代码
}

export default function MembersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<UnionMember[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: '',
    unit: '',
    position: '',
    year: '',
    phone: '',
    cardNo: '',
    mail: '',
    stuid: '',
    employeeId: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    unit: '',
    position: '',
    year: '',
    phone: '',
    cardNo: '',
    mail: '',
  });

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 编辑行引用，用于滚动
  const editRowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

  useEffect(() => {
    fetchMembers();
  }, []);

  // 当开始编辑时，滚动到对应位置
  useEffect(() => {
    if (editingMemberId && editRowRefs.current[editingMemberId]) {
      editRowRefs.current[editingMemberId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [editingMemberId]);

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 防抖搜索
  const debouncedSearch = useCallback((keyword: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (!keyword.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(`/api/admin/settings/members/search?keyword=${encodeURIComponent(keyword)}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data || []);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
    debouncedSearch(value);
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    setAddForm(prev => ({
      ...prev,
      name: result.name,
      unit: result.unit,
      cardNo: result.cardNo,
      stuid: result.cardNo,
      employeeId: result.employeeId,
    }));
    setSearchKeyword('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/members');
      const json = await res.json();
      if (json.success) setMembers(json.data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdd = async () => {
    if (!addForm.name || !addForm.cardNo) {
      alert('姓名和校园卡号不能为空');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddForm(false);
        setAddForm({ name: '', unit: '', position: '', year: '', phone: '', cardNo: '', mail: '', stuid: '', employeeId: '' });
        fetchMembers();
      } else {
        alert(json.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.cardNo) {
      alert('姓名和校园卡号不能为空');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/settings/members/${editingMemberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        setEditingMemberId(null);
        fetchMembers();
      } else {
        alert(json.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('确定要删除这个成员吗？')) return;

    try {
      const res = await fetch(`/api/admin/settings/members/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchMembers();
      } else {
        alert(json.error || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleStartEdit = (member: UnionMember) => {
    setEditForm({
      name: member.name,
      unit: member.unit,
      position: member.position || '',
      year: member.year || '',
      phone: member.phone,
      cardNo: member.cardNo,
      mail: member.mail || '',
    });
    setEditingMemberId(member.id);
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setAddForm({ name: '', unit: '', position: '', year: '', phone: '', cardNo: '', mail: '', stuid: '', employeeId: '' });
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
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl text-white">
          <Users size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">教代会成员管理</h1>
          <p className="text-gray-500 text-sm">管理教代会代表信息</p>
        </div>
      </div>

      {/* 添加成员表单区域 */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新成员</h3>

          {/* 人员搜索区域 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search size={16} className="inline mr-1" />
              从全校人员库搜索
            </label>
            <div className="relative" ref={searchRef}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={handleSearchChange}
                  className="flex-1 px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                  placeholder="输入校园卡号、姓名、职工号或单位名称搜索..."
                />
                {searchKeyword && (
                  <button
                    onClick={() => {
                      setSearchKeyword('');
                      setSearchResults([]);
                    }}
                    className="p-3 text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                )}
                {searching && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    <Loader2 size={18} className="text-blue-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* 搜索结果下拉框 */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-800">{result.name}</span>
                          <span className="ml-2 text-sm text-gray-500">({result.employeeId || '无职工号'})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-blue-600">{result.unit}</div>
                          <div className="text-xs text-gray-400">校园卡号: {result.cardNo}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">校园卡号 *</label>
              <input
                type="text"
                value={addForm.cardNo}
                onChange={(e) => setAddForm(prev => ({ ...prev, cardNo: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入校园卡号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">单位</label>
              <input
                type="text"
                value={addForm.unit}
                onChange={(e) => setAddForm(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入单位"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
              <input
                type="email"
                value={addForm.mail || ''}
                onChange={(e) => setAddForm(prev => ({ ...prev, mail: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
              <input
                type="text"
                value={addForm.phone}
                onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入联系电话"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveAdd}
              disabled={saving}
              className="px-6 py-3 bg-[#1779DC] text-white rounded-xl hover:bg-[#2861AE] transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleCancelAdd}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 成员列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">教代会成员列表 ({members.length}人)</h3>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1779DC] text-white rounded-lg hover:bg-[#2861AE] transition-colors"
            >
              <Plus size={16} />
              添加成员
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">校园卡号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">单位</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">邮箱</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">联系电话</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">管理员</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => (
                <React.Fragment key={member.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{member.cardNo}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{member.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.unit || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.mail || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {member.isAdmin ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">是</span>
                      ) : (
                        <span className="text-gray-400">否</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStartEdit(member)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(String(member.id))}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* 编辑行展开 */}
                  {editingMemberId === member.id && (
                    <tr
                      ref={(el) => editRowRefs.current[member.id] = el}
                      className="bg-blue-50/50"
                    >
                      <td colSpan={7} className="px-4 py-4">
                        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                          <Edit size={14} />
                          <span className="font-medium">编辑成员: {member.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">校园卡号</label>
                            <input
                              type="text"
                              value={editForm.cardNo}
                              onChange={(e) => setEditForm(prev => ({ ...prev, cardNo: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1779DC] focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">姓名</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1779DC] focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">单位</label>
                            <input
                              type="text"
                              value={editForm.unit}
                              onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1779DC] focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">邮箱</label>
                            <input
                              type="email"
                              value={editForm.mail || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, mail: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1779DC] focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">联系电话</label>
                            <input
                              type="text"
                              value={editForm.phone}
                              onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1779DC] focus:border-transparent text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="px-4 py-2 bg-[#1779DC] text-white rounded-lg hover:bg-[#2861AE] transition-colors disabled:opacity-50 text-sm"
                          >
                            {saving ? '保存中...' : '保存'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                          >
                            取消
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    暂无成员数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
