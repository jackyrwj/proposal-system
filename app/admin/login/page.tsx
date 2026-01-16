'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, Loader2, Shield } from 'lucide-react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('000217');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 隐藏前台 Header + 自动填充默认账号密码
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      return parts.length === 2 ? parts.pop()?.split(';').shift() : null;
    };

    // 如果已登录，直接跳转到后台
    const token = getCookie('adminToken') || localStorage.getItem('adminToken');
    if (token) {
      router.push('/admin');
    }

    // 自动填充默认账号密码
    setUsername('000217');
    setPassword('123456');

    const nav = document.querySelector('nav.sticky');
    if (nav) (nav as HTMLElement).style.display = 'none';
    return () => {
      if (nav) (nav as HTMLElement).style.display = '';
    };
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (json.success) {
        localStorage.setItem('adminToken', json.token);
        localStorage.setItem('adminUser', JSON.stringify(json.user));
        // 读取回跳地址（middleware 会传递 redirect 参数）
        const redirect = searchParams.get('redirect');
        router.push(redirect || '/admin');
      } else {
        setError(json.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1779DC] to-[#2861AE] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Shield size={32} className="text-[#1779DC]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">管理后台登录</h1>
          <p className="text-blue-100">深圳大学教代会提案工作管理系统</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
                  placeholder="请输入用户名"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-transparent transition-all"
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  登录
                </>
              )}
            </button>
          </form>

          {/* Admin Credentials Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm">
            <p className="font-semibold text-[#1779DC] mb-2">管理员账号</p>
            <ul className="text-gray-600 space-y-1">
              <li>校园卡号：000217 (曹克颖)</li>
              <li>密码：123456</li>
            </ul>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-gray-500 hover:text-[#1779DC] transition-colors"
            >
              返回前台首页
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-sm mt-8">
          © 2025 深圳大学教代会
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#1779DC] to-[#2861AE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  );
}
