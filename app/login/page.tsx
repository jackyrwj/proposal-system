'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Users, Lock, Eye, EyeOff, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';

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

  const handleCasLogin = () => {
    const redirect = searchParams.get('redirect');
    if (redirect) {
      sessionStorage.setItem('loginRedirect', redirect);
    }
    const CAS_SERVER = 'https://authserver.szu.edu.cn/authserver/';
    const SERVICE_URL = 'http://172.31.171.244:3000/api/cas/callback';
    window.location.href = `${CAS_SERVER}login?service=${encodeURIComponent(SERVICE_URL)}`;
  };

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
          loginType: 'department',
        }),
      });

      const json = await res.json();

      if (json.success) {
        localStorage.setItem('token', json.token);
        localStorage.setItem('user', JSON.stringify(json.user));
        document.cookie = `user=${encodeURIComponent(JSON.stringify(json.user))}; path=/; max-age=${7 * 24 * 60 * 60}`;
        document.cookie = `token=${json.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
        window.dispatchEvent(new Event('userLoggedIn'));
        router.push('/');
      } else {
        setError(json.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 集体账号登录表单
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
          <p className="text-gray-500">欢迎回来，请选择登录方式</p>
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

          {/* 集体账号登录表单 */}
          {loginType === 'department' && (
            <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                  <Users size={16} className="text-[#1779DC]" />
                  账号
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3.5 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1779DC] focus:border-[#1779DC] focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    placeholder="请输入集体账号"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Users size={18} />
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

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

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
          )}

          {/* 个人账号提示 */}
          {loginType === 'individual' && (
            <div className="px-8 pb-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={36} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">教代会代表登录</h3>
                <p className="text-gray-500 mb-6">使用深圳大学统一身份认证登录</p>
              </div>
              <button
                onClick={handleCasLogin}
                className="w-full py-4 bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white rounded-xl hover:shadow-xl hover:scale-[1.02] font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                前往统一身份认证登录
              </button>
            </div>
          )}
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
