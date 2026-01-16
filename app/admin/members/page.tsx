'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Loader2,
  Plus,
  Edit,
  Trash2,
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

export default function MembersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<UnionMember[]>([]);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<UnionMember | null>(null);
  const [memberForm, setMemberForm] = useState({
    name: '',
    unit: '',
    position: '',
    year: '',
    phone: '',
    cardNo: '',
    mail: '',
  });

  useEffect(() => {
    fetchMembers();
  }, []);

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

  const handleSaveMember = async () => {
    if (!memberForm.name || !memberForm.cardNo) {
      alert('姓名和校园卡号不能为空');
      return;
    }

    setSaving(true);
    try {
      const url = editingMember
        ? `/api/admin/settings/members/${editingMember.id}`
        : '/api/admin/settings/members';
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowMemberForm(false);
        setEditingMember(null);
        setMemberForm({ name: '', unit: '', position: '', year: '', phone: '', cardNo: '', mail: '' });
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

  const handleEditMember = (member: UnionMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      unit: member.unit,
      position: member.position || '',
      year: member.year || '',
      phone: member.phone,
      cardNo: member.cardNo,
      mail: member.mail || '',
    });
    setShowMemberForm(true);
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

      {/* 添加/编辑表单 */}
      {showMemberForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingMember ? '编辑成员' : '添加新成员'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">校园卡号 *</label>
              <input
                type="text"
                value={memberForm.cardNo}
                onChange={(e) => setMemberForm(prev => ({ ...prev, cardNo: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入校园卡号"
                disabled={!!editingMember}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">姓名 *</label>
              <input
                type="text"
                value={memberForm.name}
                onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">单位</label>
              <input
                type="text"
                value={memberForm.unit}
                onChange={(e) => setMemberForm(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入单位"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
              <input
                type="email"
                value={memberForm.mail || ''}
                onChange={(e) => setMemberForm(prev => ({ ...prev, mail: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">届别</label>
              <input
                type="text"
                value={memberForm.year}
                onChange={(e) => setMemberForm(prev => ({ ...prev, year: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="如：第八届"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
              <input
                type="text"
                value={memberForm.phone}
                onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入联系电话"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveMember}
              disabled={saving}
              className="px-6 py-3 bg-[#1779DC] text-white rounded-xl hover:bg-[#2861AE] transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                setShowMemberForm(false);
                setEditingMember(null);
                setMemberForm({ name: '', unit: '', position: '', year: '', phone: '', cardNo: '', mail: '' });
              }}
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
          <h3 className="font-semibold text-gray-800">教代会成员列表</h3>
          <button
            onClick={() => {
              setEditingMember(null);
              setMemberForm({ name: '', unit: '', position: '', year: '', phone: '', cardNo: '', mail: '' });
              setShowMemberForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1779DC] text-white rounded-lg hover:bg-[#2861AE] transition-colors"
          >
            <Plus size={16} />
            添加成员
          </button>
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
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{member.id}</td>
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
                        onClick={() => handleEditMember(member)}
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
