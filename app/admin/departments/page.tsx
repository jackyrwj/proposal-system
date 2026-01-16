'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface Department {
  departId: number;
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    account: '',
    password: '',
  });

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Password management state
  const [passwordManageDept, setPasswordManageDept] = useState<Department | null>(null);
  const [manualPassword, setManualPassword] = useState('');
  const [showManagePassword, setShowManagePassword] = useState(false);
  const [resetPasswordDept, setResetPasswordDept] = useState<Department | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreatePassword, setIsCreatePassword] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

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

  const handleSaveDept = async () => {
    if (!deptForm.name || !deptForm.account) {
      showToast('部门名称和账号不能为空', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingDept
        ? `/api/admin/settings/departments/${editingDept.departId}`
        : '/api/admin/settings/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast(editingDept ? '更新成功' : '添加成功', 'success');
        setShowDeptForm(false);
        setEditingDept(null);
        setDeptForm({ name: '', account: '', password: '' });

        // If creating new department and password was generated, show it
        if (!editingDept && json.data?.password) {
          setNewPassword(json.data.password);
          setResetPasswordDept({ departId: json.data.departId, name: deptForm.name, account: deptForm.account });
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

  const handleDeleteDept = async (deptId: number) => {
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

  const handleEditDept = (dept: Department) => {
    setEditingDept({ ...dept, name: dept.name });
    setDeptForm({ name: dept.name, account: dept.account, password: '' });
    setShowDeptForm(true);
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
            } animate-slide-in`}
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
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-scale-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">密码管理</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">部门名称</p>
              <p className="font-medium text-gray-800 mb-3">{passwordManageDept.name}</p>
              <p className="text-sm text-gray-500 mb-1">登录账号</p>
              <p className="font-medium text-gray-800">{passwordManageDept.account}</p>
            </div>

            {/* 新密码输入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
              <div className="relative">
                <input
                  type={showManagePassword ? 'text' : 'password'}
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  placeholder="输入密码或点击随机生成"
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
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-scale-in">
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

      {/* 添加/编辑表单 */}
      {showDeptForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingDept ? '编辑部门' : '添加新部门'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">部门名称 *</label>
              <input
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入部门名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">账号 *</label>
              <input
                type="text"
                value={deptForm.account}
                onChange={(e) => setDeptForm(prev => ({ ...prev, account: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                placeholder="请输入登录账号"
                disabled={!!editingDept}
              />
            </div>
            {!editingDept && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">初始密码</label>
                <input
                  type="text"
                  value={deptForm.password}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent"
                  placeholder="留空自动生成8位随机密码"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveDept}
              disabled={saving}
              className="px-6 py-3 bg-[#1779DC] text-white rounded-xl hover:bg-[#2861AE] transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => {
                setShowDeptForm(false);
                setEditingDept(null);
                setDeptForm({ name: '', account: '', password: '' });
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
          <h3 className="font-semibold text-gray-800">职能部门列表</h3>
          <button
            onClick={() => {
              setEditingDept(null);
              setDeptForm({ name: '', account: '', password: '' });
              setShowDeptForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1779DC] text-white rounded-lg hover:bg-[#2861AE] transition-colors"
          >
            <Plus size={16} />
            添加部门
          </button>
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
                <tr key={dept.departId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{dept.departId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{dept.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{dept.account}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditDept(dept)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => setPasswordManageDept(dept)}
                        className="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-sm"
                        title="密码管理"
                      >
                        密码管理
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept.departId)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
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
