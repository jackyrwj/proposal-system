'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  RefreshCw,
  Key,
  Download,
  Shield,
} from 'lucide-react';

interface Department {
  departId: string;
  name: string;
  account: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function DepartmentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: '',
    account: '',
    password: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    account: '',
  });

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Password management state
  const [passwordManageDept, setPasswordManageDept] = useState<Department | null>(null);
  const [originalPassword, setOriginalPassword] = useState('');
  const [manualPassword, setManualPassword] = useState('');
  const [showManagePassword, setShowManagePassword] = useState(false);
  const [resetPasswordDept, setResetPasswordDept] = useState<Department | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreatePassword, setIsCreatePassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // 编辑行引用，用于滚动
  const editRowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

  useEffect(() => {
    fetchDepartments();
  }, []);

  // 当开始编辑时，滚动到对应位置
  useEffect(() => {
    if (editingDeptId && editRowRefs.current[editingDeptId]) {
      editRowRefs.current[editingDeptId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [editingDeptId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/departments');
      const json = await res.json();
      if (json.success) setDepartments(json.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdd = async () => {
    if (!addForm.name || !addForm.account) {
      showToast('部门名称和账号不能为空', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast('添加成功', 'success');
        setShowAddForm(false);
        setAddForm({ name: '', account: '', password: '' });

        // If creating new department and password was generated, show it
        if (json.data?.password) {
          setNewPassword(json.data.password);
          setResetPasswordDept({ departId: String(json.data.departId), name: addForm.name, account: addForm.account });
          setShowPassword(false);
          setCopied(false);
          setIsCreatePassword(true);
        }

        fetchDepartments();
      } else {
        showToast(json.error || '操作失败', 'error');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.account) {
      showToast('部门名称和账号不能为空', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/settings/departments/${editingDeptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast('更新成功', 'success');
        setEditingDeptId(null);
        fetchDepartments();
      } else {
        showToast(json.error || '保存失败', 'error');
      }
    } catch (error) {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    if (!confirm('确定要删除这个部门吗？')) return;

    try {
      const res = await fetch(`/api/admin/settings/departments/${deptId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('删除成功', 'success');
        fetchDepartments();
      } else {
        showToast(json.error || '删除失败', 'error');
      }
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleStartEdit = (dept: Department) => {
    setEditForm({
      name: dept.name,
      account: dept.account,
    });
    setEditingDeptId(dept.departId);
  };

  const handleCancelEdit = () => {
    setEditingDeptId(null);
  };

  // 从 CDSP 同步部门数据（全量替换）
  const handleSync = async () => {
    if (!confirm('确定要从全校组织机构同步部门数据吗？\n\n- 将删除现有所有部门数据\n- 重新从CDSP导入最新数据\n- 此操作可能需要几秒钟')) {
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/admin/settings/departments/sync', {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        const { added, skipped } = json.data;
        showToast(
          `同步成功！共导入 ${added} 个部门，跳过 ${skipped} 个无效数据`,
          'success'
        );
        fetchDepartments();
      } else {
        showToast(json.error || '同步失败', 'error');
      }
    } catch (error) {
      showToast('同步失败', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleResetPassword = async (dept: Department, password?: string) => {
    const finalPassword = password || generateRandomPassword();
    setNewPassword(finalPassword);
    setResetPasswordDept(dept);
    setShowPassword(false);
    setCopied(false);
    setIsCreatePassword(false);

    try {
      const res = await fetch(`/api/admin/settings/departments/${dept.departId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: finalPassword }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('密码已重置', 'success');
      } else {
        showToast(json.error || '操作失败', 'error');
        setResetPasswordDept(null);
      }
    } catch (error) {
      showToast('操作失败', 'error');
      setResetPasswordDept(null);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 重置所有部门密码
  const handleResetAllPasswords = async () => {
    if (!confirm('确定要重置所有部门的密码吗？\n\n- 所有部门密码将重置为6位随机密码\n- 重置后需要将新密码告知各部门\n- 此操作不可撤销')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/settings/departments/reset-all-passwords', {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        showToast('密码重置成功', 'success');
        fetchDepartments();
      } else {
        showToast(json.error || '操作失败', 'error');
      }
    } catch (error) {
      showToast('操作失败', 'error');
    }
  };

  // 导出部门数据为CSV
  const handleExportCSV = async () => {
    if (departments.length === 0) {
      showToast('暂无数据可导出', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/settings/departments/all-passwords');
      const json = await res.json();

      if (!json.success) {
        showToast(json.error || '获取密码失败', 'error');
        return;
      }

      // 转换为 map 方便查找
      const passwordMap = new Map<string, string>();
      json.data.forEach((item: { account: string; password: string }) => {
        passwordMap.set(item.account, item.password);
      });

      // 表头
      const headers = ['部门名称', '账号', '密码'];

      // 转换数据为CSV格式
      const rows = departments.map(dept => {
        const password = passwordMap.get(dept.account) || '*';
        return `${dept.name},${dept.account},${password}`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `部门账号_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('导出成功', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('导出失败', 'error');
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
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <Check size={18} />
            ) : (
              <X size={18} />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* 密码管理弹窗 */}
      {passwordManageDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">密码管理</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">部门名称</p>
              <p className="font-medium text-gray-800 mb-3">{passwordManageDept.name}</p>
              <p className="text-sm text-gray-500 mb-1">登录账号</p>
              <p className="font-medium text-gray-800">{passwordManageDept.account}</p>
            </div>

            {/* 原密码展示 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
              <div className="relative">
                <input
                  type={showManagePassword ? 'text' : 'password'}
                  value={loadingPassword ? '加载中...' : originalPassword}
                  readOnly
                  className="w-full px-4 py-3 pr-24 border border-gray-200 rounded-xl bg-gray-100 text-gray-800 font-mono"
                  placeholder="点击显示密码"
                />
                <button
                  onClick={() => setShowManagePassword(!showManagePassword)}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                  title={showManagePassword ? '隐藏密码' : '显示密码'}
                >
                  {showManagePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 新密码输入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">设置新密码</label>
              <div className="relative">
                <input
                  type={showManagePassword ? 'text' : 'password'}
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="输入新密码或点击随机生成"
                  className="w-full px-4 py-3 pr-24 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowManagePassword(!showManagePassword)}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title={showManagePassword ? '隐藏密码' : '显示密码'}
                  >
                    {showManagePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    onClick={() => setManualPassword(generateRandomPassword())}
                    className="p-2 text-[#1779DC] hover:text-[#2861AE]"
                    title="随机生成密码"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const passwordToUse = manualPassword || generateRandomPassword();
                setPasswordManageDept(null);
                setManualPassword('');
                setOriginalPassword('');
                setShowManagePassword(false);
                handleResetPassword(passwordManageDept, passwordToUse);
              }}
              className="w-full px-6 py-3 bg-[#1779DC] text-white rounded-xl hover:bg-[#2861AE] transition-colors font-medium mb-3"
            >
              确认重设密码
            </button>
            <button
              onClick={() => {
                setPasswordManageDept(null);
                setManualPassword('');
                setOriginalPassword('');
                setShowManagePassword(false);
              }}
              className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 密码显示弹窗 */}
      {resetPasswordDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {isCreatePassword ? '部门已创建' : '密码已重置'}
            </h3>
            <p className="text-gray-600 mb-4">
              <span className="font-medium text-gray-800">{resetPasswordDept.name}</span>
              {isCreatePassword ? '的初始密码为：' : '的新密码为：'}
            </p>
            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  readOnly
                  className="w-full px-4 py-3 pr-24 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 font-mono"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={handleCopyPassword}
                className={`p-3 rounded-xl transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResetPasswordDept(null);
                  setIsCreatePassword(false);
                }}
                className="flex-1 px-6 py-3 bg-[#1779DC] text-white rounded-xl hover:bg-[#2861AE] transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl text-white">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">职能部门管理</h1>
          <p className="text-gray-500 text-sm">管理职能部门账号信息</p>
        </div>
      </div>

      {/* 添加部门表单区域 */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新部门</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">部门名称 *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入部门名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">账号 *</label>
              <input
                type="text"
                value={addForm.account}
                onChange={(e) => setAddForm(prev => ({ ...prev, account: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入登录账号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">初始密码</label>
              <input
                type="text"
                value={addForm.password}
                onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="留空自动生成8位随机密码"
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
              onClick={() => {
                setShowAddForm(false);
                setAddForm({ name: '', account: '', password: '' });
              }}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 部门列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">职能部门列表 ({departments.length}个)</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAllPasswords}
              disabled={departments.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-amber-400 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
              title="重置所有部门密码"
            >
              <Shield size={16} />
              重置密码
            </button>
            <button
              onClick={handleExportCSV}
              disabled={departments.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="导出CSV"
            >
              <Download size={16} />
              导出
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 border border-[#1779DC] text-[#1779DC] rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? '同步中...' : '同步数据'}
            </button>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1779DC] text-white rounded-lg hover:bg-[#2861AE] transition-colors"
              >
                <Plus size={16} />
                添加部门
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">部门ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">部门名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">账号</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((dept) => (
                <React.Fragment key={dept.departId}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{dept.departId}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{dept.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{dept.account}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStartEdit(dept)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            setPasswordManageDept(dept);
                            setManualPassword('');
                            setShowManagePassword(false);
                            // 获取原密码
                            setLoadingPassword(true);
                            try {
                              const res = await fetch(`/api/admin/settings/departments/${dept.departId}/reset-password`);
                              const json = await res.json();
                              if (json.success) {
                                setOriginalPassword(json.data.password);
                              } else {
                                setOriginalPassword('（无法获取原密码）');
                              }
                            } catch (error) {
                              setOriginalPassword('（获取失败）');
                            } finally {
                              setLoadingPassword(false);
                            }
                          }}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="密码管理"
                        >
                          <Key size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('确定要删除这个部门吗？')) {
                              handleDeleteDept(dept.departId);
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* 编辑行展开 */}
                  {editingDeptId === dept.departId && (
                    <tr
                      ref={(el) => { editRowRefs.current[dept.departId] = el; }}
                      className="bg-blue-50/50"
                    >
                      <td colSpan={4} className="px-4 py-4">
                        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                          <Edit size={14} />
                          <span className="font-medium">编辑部门: {dept.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3 max-w-md">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">部门名称</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1779DC] focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">账号</label>
                            <input
                              type="text"
                              value={editForm.account}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
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
              {departments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                    暂无部门数据
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
