'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, Users, Menu, X, Send, FileText, ShieldCheck, LogOut, ChevronDown, Mail, Badge } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [messageMenuOpen, setMessageMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);

  // 获取用户信息的函数
  const loadUser = () => {
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const userStr = getCookie('user') || localStorage.getItem('user');
    if (userStr) {
      try {
        // 解码 URL 编码的 cookie 值
        const decodedStr = decodeURIComponent(userStr);
        setUser(JSON.parse(decodedStr));
      } catch (e) {
        console.error('Parse user error:', e);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // 初始加载
    loadUser();

    // 监听 storage 事件（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUser();
      }
    };

    // 监听自定义登录事件（同标签页内通信）
    const handleLoginEvent = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleLoginEvent);
    window.addEventListener('userLoggedOut', handleLoginEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleLoginEvent);
      window.removeEventListener('userLoggedOut', handleLoginEvent);
    };
  }, []);

  // 获取未读消息数量
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/messages/unread');
        const json = await res.json();
        if (json.success) {
          setUnreadCount(json.count);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // 每 30 秒刷新一次未读数量
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // 获取消息列表 - 获取所有消息（包括已读），直接使用数据库的 hasRead 状态
  const fetchMessages = async () => {
    try {
      // 不使用 unreadOnly 参数，获取所有消息，根据数据库的 hasRead 字段判断
      const res = await fetch('/api/messages');
      const json = await res.json();
      if (json.success) {
        setMessages(json.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // 打开消息菜单时获取消息
  useEffect(() => {
    if (messageMenuOpen && user) {
      fetchMessages();
    }
  }, [messageMenuOpen, user]);

  // 标记消息为已读
  const markAsRead = async (msgId: number, proposalId?: number) => {
    try {
      const res = await fetch('/api/messages/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgIds: [msgId] }),
      });
      const json = await res.json();

      if (json.success) {
        // 更新本地消息列表中的已读状态
        setMessages(prev =>
          prev.map(msg =>
            msg.msgId === msgId ? { ...msg, hasRead: 1 } : msg
          )
        );

        // 重新获取未读数量
        const unreadRes = await fetch('/api/messages/unread');
        const unreadJson = await unreadRes.json();
        if (unreadJson.success) {
          setUnreadCount(unreadJson.count);
        }
      }
      // 如果有提案ID，跳转到提案详情页
      if (proposalId) {
        setMessageMenuOpen(false);
        router.push(`/proposals/${proposalId}`);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // 全部标记为已读
  const markAllAsRead = async () => {
    try {
      // 找出所有未读消息的ID
      const unreadMsgIds = messages.filter(m => m.hasRead === 0).map(m => m.msgId);

      if (unreadMsgIds.length > 0) {
        await fetch('/api/messages/read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msgIds: unreadMsgIds }),
        });

        // 更新本地消息列表中的所有消息为已读
        setMessages(prev =>
          prev.map(msg => ({ ...msg, hasRead: 1 }))
        );

        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLogout = () => {
    // 清除用户 Cookie 和 localStorage
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('user');
    setUser(null);
    setUserMenuOpen(false);
    // 触发自定义事件通知其他组件
    window.dispatchEvent(new Event('userLoggedOut'));
    router.push('/');
  };

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/news', label: '工作动态' },
    { href: '/formal-proposals', label: '正式提案' },
    { href: '/proposals', label: '提案建议' },
    { href: '/my-proposals', label: '我的提案' },
    { href: '/about', label: '关于提案工作' },
  ];

  return (
    <>
      {/* MAIN NAVIGATION - Sticky */}
      <nav className="sticky top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#1779DC] to-[#2861AE] shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <User className="text-[#1779DC]" size={22} />
              </div>
              <span className="hidden sm:block font-bold text-lg text-white">
                教代会提案系统
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 relative nav-item
                      ${isActive
                        ? 'text-[#1779DC] bg-white shadow-md'
                        : 'text-white/90 hover:text-white hover:bg-white/20'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Desktop Actions - User Menu or Login */}
            <div className="hidden lg:flex items-center gap-3 relative">
              {user ? (
                <>
                  {/* 消息按钮 */}
                  <div className="relative">
                    <button
                      onClick={() => setMessageMenuOpen(!messageMenuOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all relative"
                    >
                      <Mail size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* 消息下拉菜单 */}
                    {messageMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMessageMenuOpen(false)}
                        ></div>
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl z-20 overflow-hidden">
                          {/* 消息头部 */}
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <span className="font-semibold text-gray-700">站内信</span>
                            {messages.some(m => m.hasRead === 0) && (
                              <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                全部已读
                              </button>
                            )}
                          </div>

                          {/* 消息列表 */}
                          <div className="max-h-80 overflow-y-auto">
                            {messages.length === 0 ? (
                              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                暂无消息
                              </div>
                            ) : (
                              messages.map((msg) => {
                                // 直接使用数据库的 hasRead 字段判断是否已读
                                const isRead = msg.hasRead === 1;
                                return (
                                  <div
                                    key={msg.msgId}
                                    onClick={() => !isRead && markAsRead(msg.msgId, msg.context?.proposalId)}
                                    className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${
                                      isRead ? 'bg-gray-100' : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                        isRead ? 'bg-gray-300' : 'bg-blue-500'
                                      }`}></div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${
                                          isRead ? 'text-gray-400' : 'text-gray-800'
                                        }`}>
                                          {msg.context?.title || '系统消息'}
                                        </p>
                                        <p className={`text-xs truncate mt-1 ${
                                          isRead ? 'text-gray-400' : 'text-gray-500'
                                        }`}>
                                          {msg.context?.content || ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {msg.time}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* 消息底部 */}
                          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                            <Link
                              href="/messages"
                              onClick={() => setMessageMenuOpen(false)}
                              className="block text-center text-sm text-blue-600 hover:text-blue-700"
                            >
                              查看全部消息
                            </Link>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 提交提案按钮 */}
                  <Link
                    href="/submit"
                    className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 bg-white text-[#1779DC] hover:bg-gray-50 shadow-lg"
                  >
                    <Send size={16} />
                    提交提案
                  </Link>

                  {/* 用户下拉菜单 */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    >
                      <User size={16} />
                      <span>{user.name || user.id}</span>
                      <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* 下拉菜单 */}
                    {userMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setUserMenuOpen(false)}
                        ></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-20 overflow-hidden">
                          <Link
                            href="/my-proposals"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <FileText size={16} />
                            我的提案
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={16} />
                            退出登录
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  >
                    <User size={16} />
                    登录
                  </Link>
                </>
              )}
              {/* 始终显示的后台系统按钮 */}
              <Link
                href="/admin/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <ShieldCheck size={16} />
                后台系统
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-white/20 animate-slide-up">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        px-4 py-3 rounded-lg font-medium transition-all
                        ${isActive
                          ? 'bg-white text-[#1779DC]'
                          : 'text-white/90 hover:bg-white/20'
                        }
                      `}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="h-px bg-white/20 my-2" />
                {user ? (
                  <>
                    <Link
                      href="/my-proposals"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-white hover:bg-white/20"
                    >
                      <FileText size={16} />
                      我的提案
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-red-300 hover:bg-white/20"
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-white hover:bg-white/20"
                    >
                      <User size={16} />
                      登录
                    </Link>
                  </>
                )}
                {/* 移动端：始终显示的后台系统按钮 */}
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-white hover:bg-white/20"
                >
                  <ShieldCheck size={16} />
                  后台系统
                </Link>
                <Link
                  href="/submit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium bg-white text-[#1779DC] shadow-lg"
                >
                  <Send size={16} />
                  提交提案
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
