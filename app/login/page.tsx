'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Users, Lock, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginType, setLoginType] = useState<'individual' | 'department'>('individual');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 切换登录类型时自动填充默认账号密码
  useEffect(() => {
    if (loginType === 'individual') {
      setFormData({ username: '000217', password: '123456' });
    } else {
      setFormData({ username: 'account1', password: '654321' });
    }
  }, [loginType]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          loginType,
        }),
      });

      const json = await res.json();

      if (json.success) {
        // 保存登录信息到 localStorage
        localStorage.setItem('token', json.token);
        localStorage.setItem('user', JSON.stringify(json.user));

        // 同时保存到 cookie，供服务端 API 使用
        document.cookie = `user=${encodeURIComponent(JSON.stringify(json.user))}; path=/; max-age=${7 * 24 * 60 * 60}`;
        document.cookie = `token=${json.token}; path=/; max-age=${7 * 24 * 60 * 60}`;

        // 触发自定义事件通知其他组件（如 Header）更新状态
        window.dispatchEvent(new Event('userLoggedIn'));

        // 读取回跳地址，如果没有则跳转到首页
        const redirect = searchParams.get('redirect');
        router.push(redirect || '/');
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
    <div className="gradient-hero min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full animate-scale-in">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-3xl shadow-2xl mb-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <User className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            教代会提案工作管理系统
          </h1>
          <p className="text-gray-500">欢迎回来，请登录您的账号</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          {/* 登录类型切换 */}
          <div className="flex p-2 bg-gray-100 m-4 rounded-2xl">
            <button
              onClick={() => setLoginType('individual')}
              className={`flex-1 py-3 text-center font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                loginType === 'individual'
                  ? 'bg-white text-[#1779DC] shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User size={18} />
              个人账号
            </button>
            <button
              onClick={() => setLoginType('department')}
              className={`flex-1 py-3 text-center font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                loginType === 'department'
                  ? 'bg-white text-[#1779DC] shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={18} />
              集体账号
            </button>
          </div>

          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                {loginType === 'individual' ? <User size={16} className="text-[#1779DC]" /> : <Users size={16} className="text-[#1779DC]" />}
                {loginType === 'individual' ? '校园卡号' : '账号'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3.5 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-[#1779DC] focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  placeholder={loginType === 'individual' ? '请输入校园卡号' : '请输入集体账号'}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {loginType === 'individual' ? <User size={18} /> : <Users size={18} />}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                <Lock size={16} className="text-[#1779DC]" />
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3.5 pl-12 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-[#1779DC] focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  placeholder="请输入密码"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1779DC] transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded text-[#1779DC] focus:ring-[#1779DC] border-gray-300" />
                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">记住我</span>
              </label>
              <a href="#" className="text-sm text-[#1779DC] hover:text-[#2861AE] transition-colors font-medium">
                忘记密码？
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2.5 border-white border-t-transparent rounded-full animate-spin"></div>
                  登录中...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  登录
                </>
              )}
            </button>
          </form>

          <div className="px-8 pb-8">
            {loginType === 'individual' && (
              <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl text-sm border border-blue-100">
                <p className="font-semibold text-[#2861AE] mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  教代会代表账号
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#1779DC] mt-0.5">•</span>
                    <div>
                      <span>校园卡号：如 000217、000330 等</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#1779DC] mt-0.5">•</span>
                    <span>密码：123456</span>
                  </li>
                </ul>
              </div>
            )}

            {loginType === 'department' && (
              <div className="mb-6 p-5 bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl text-sm border border-green-100">
                <p className="font-semibold text-[#2E7D32] mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  职能部门账号
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#2E7D32] mt-0.5">•</span>
                    <div>
                      <span>账号：如 account1、account2 等</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#2E7D32] mt-0.5">•</span>
                    <span>密码：654321</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>©深圳大学校工会教代会 | 联系电话：26536186</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="gradient-hero min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1779DC] border-t-transparent"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
