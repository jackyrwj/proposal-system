'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  FileText,
  Send,
  Newspaper,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  PenTool,
  UserCheck,
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard, href: '/admin' },
  { id: 'tajy', label: '提案建议', icon: Send, href: '/admin/tajy' },
  { id: 'zsta', label: '正式提案', icon: FileText, href: '/admin/zsta' },
  { id: 'xwdt', label: '提案工作动态', icon: Newspaper, href: '/admin/xwdt' },
  { id: 'about', label: '关于提案工作', icon: PenTool, href: '/admin/about' },
  { id: 'signature', label: '代附议人署名', icon: UserCheck, href: '/admin/signature' },
  { id: 'settings', label: '系统管理', icon: Settings, href: '/admin/settings', hasChildren: true },
];

const settingsSubItems = [
  { id: 'home-params', label: '首页参数设置', href: '/admin/home-params' },
  { id: 'members', label: '教代会成员管理', href: '/admin/members' },
  { id: 'departments', label: '职能部门管理', href: '/admin/departments' },
  { id: 'category', label: '提案类别管理', href: '/admin/category' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Auto-expand settings menu when on settings pages
  useEffect(() => {
    if (pathname.startsWith('/admin/home-params') ||
        pathname.startsWith('/admin/members') ||
        pathname.startsWith('/admin/departments') ||
        pathname.startsWith('/admin/category')) {
      setExpandedMenu('settings');
    }
  }, [pathname]);

  useEffect(() => {
    // 读取 Cookie 或 localStorage
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const token = getCookie('adminToken') || localStorage.getItem('adminToken');
    const userStr = getCookie('adminUser') || localStorage.getItem('adminUser');

    if (!token && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Parse user error:', e);
      }
    }

    // 隐藏前台 Header（nav元素）和 Footer
    const nav = document.querySelector('nav.sticky');
    const mainContent = document.querySelector('body > main');
    if (nav) (nav as HTMLElement).style.display = 'none';
    if (mainContent) (mainContent as HTMLElement).style.minHeight = '100vh';

    return () => {
      if (nav) (nav as HTMLElement).style.display = '';
      if (mainContent) (mainContent as HTMLElement).style.minHeight = '';
    };
  }, [pathname, router]);

  // 获取待处理事项
  useEffect(() => {
    if (pathname === '/admin/login') return;

    const fetchPendingTasks = async () => {
      try {
        const [pendingPropRes, pendingFormalRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/proposals?limit=1&page=1&process=0`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/formal-proposals?limit=1&page=1&process=0`),
        ]);

        const [pendingPropJson, pendingFormalJson] = await Promise.all([
          pendingPropRes.json(),
          pendingFormalRes.json(),
        ]);

        const pendingPropCount = pendingPropJson.pagination?.total || 0;
        const pendingFormalCount = pendingFormalJson.pagination?.total || 0;
        const totalPending = pendingPropCount + pendingFormalCount;

        setPendingCount(totalPending);

        const tasks: any[] = [];
        if (pendingPropCount > 0) {
          tasks.push({
            title: `${pendingPropCount}条提案待审核`,
            count: pendingPropCount,
            href: '/admin/tajy',
            priority: 'high',
          });
        }
        if (pendingFormalCount > 0) {
          tasks.push({
            title: `${pendingFormalCount}条正式提案待处理`,
            count: pendingFormalCount,
            href: '/admin/zsta',
            priority: 'high',
          });
        }
        if (tasks.length === 0) {
          tasks.push({
            title: '暂无待处理事项',
            count: 0,
            href: '#',
            priority: 'medium',
          });
        }
        setPendingTasks(tasks);
      } catch (error) {
        console.error('Error fetching pending tasks:', error);
      }
    };

    fetchPendingTasks();
    // 每分钟刷新一次
    const interval = setInterval(fetchPendingTasks, 60000);
    return () => clearInterval(interval);
  }, [pathname]);

  // 处理铃铛点击
  const handleBellClick = () => {
    if (notificationOpen) {
      setNotificationOpen(false);
    } else {
      setNotificationOpen(true);
    }
  };

  // 处理待处理事项点击
  const handleTaskClick = (href: string) => {
    setNotificationOpen(false);
    if (href && href !== '#') {
      router.push(href);
    }
  };

  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const bellButton = document.querySelector('[data-bell-button]');
      const dropdown = document.querySelector('[data-notification-dropdown]');

      if (bellButton && dropdown &&
          !bellButton.contains(target) &&
          !dropdown.contains(target) &&
          notificationOpen) {
        setNotificationOpen(false);
      }
    };

    if (notificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [notificationOpen]);

  const handleLogout = async () => {
    // 清除 Cookie
    document.cookie = 'adminToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'adminUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  if (pathname === '/admin/login') {
    return (
      <div className="min-h-screen bg-gray-100">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-xl z-50 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`p-6 border-b border-gray-100 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl flex items-center justify-center flex-shrink-0">
                <Send size={20} className="text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="font-bold text-gray-800">提案管理</h1>
                  <p className="text-xs text-gray-500">管理后台</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${sidebarCollapsed ? 'px-3' : 'p-4'} space-y-1 overflow-y-auto`}>
            {menuItems.map((item) => {
              const isActive = item.id === 'dashboard'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              const isExpanded = expandedMenu === item.id;
              const hasActiveChild = item.hasChildren && settingsSubItems.some(sub => pathname === sub.href);

              if (item.hasChildren) {
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
                      className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all ${
                        isActive || hasActiveChild
                          ? 'bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon size={18} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="font-medium flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </>
                      )}
                    </button>
                    {/* Sub items */}
                    {isExpanded && !sidebarCollapsed && (
                      <div className="ml-4 pl-4 border-l border-gray-200 space-y-1">
                        {settingsSubItems.map((subItem) => {
                          const subIsActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.id}
                              href={subItem.href}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                                subIsActive
                                  ? 'bg-[#1779DC]/10 text-[#1779DC] font-medium'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {subIsActive && <div className="w-1.5 h-1.5 rounded-full bg-[#1779DC]" />}
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1779DC] to-[#2861AE] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                  {!sidebarCollapsed && isActive && <ChevronRight size={16} className="ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className={`p-4 border-t border-gray-100 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-xl ${sidebarCollapsed ? '' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || user?.id?.[0]?.toUpperCase() || 'A'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{user?.name || user?.id || 'Admin'}</p>
                  <p className="text-xs text-gray-500">管理员</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleSidebar}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                  title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                {menuItems.find((m) =>
                  m.id === 'dashboard'
                    ? pathname === '/admin'
                    : pathname === m.href || pathname.startsWith(m.href + '/')
                )?.label ||
                  '管理后台'}
                </h2>
              </div>
              <div className="flex items-center gap-3 relative">
                <button
                  data-bell-button
                  onClick={handleBellClick}
                  className={`relative p-2 rounded-xl transition-colors ${notificationOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                >
                  <Bell size={20} className="text-gray-600" />
                  {/* 红点 - 当有待处理事项时显示 */}
                  {pendingCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                </button>
                {/* 通知弹窗 */}
                {notificationOpen && (
                  <div data-notification-dropdown className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">待处理事项</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {pendingTasks.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">暂无待处理事项</div>
                      ) : (
                        pendingTasks.map((task, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleTaskClick(task.href)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left border-0 bg-transparent ${
                              task.href === '#'
                                ? 'cursor-default text-gray-400'
                                : 'hover:bg-gray-50 text-gray-700 hover:text-[#1779DC] cursor-pointer'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              task.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-sm">{task.title}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <a
                  href="/"
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Home size={16} />
                  进入前台
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
