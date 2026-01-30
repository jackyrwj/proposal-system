'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2, Clock, ArrowLeft, Trash2, CheckCheck } from 'lucide-react';

interface Message {
  msgId: number;
  cardId: string;
  informType: number;
  context: {
    title: string;
    content: string;
    proposalId?: number;
    proposalTitle?: string;
    proposerName?: string;
  };
  hasRead: number;
  time: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 获取用户信息
  useEffect(() => {
    const loadUser = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          console.error('Parse user error:', e);
        }
      }
    };
    loadUser();
  }, []);

  // 获取消息列表
  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/messages');
        const json = await res.json();
        if (json.success) {
          setMessages(json.data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [user]);

  // 标记为已读
  const markAsRead = async (msgId: number, proposalId?: number) => {
    try {
      await fetch('/api/messages/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgIds: [msgId] }),
      });

      // 更新本地状态
      setMessages(prev => prev.map(m =>
        m.msgId === msgId ? { ...m, hasRead: 1 } : m
      ));

      // 触发自定义事件通知 Header 组件刷新未读数量
      window.dispatchEvent(new CustomEvent('messagesRead', { detail: { count: 1 } }));

      // 如果有提案ID，先检查提案是否存在且未删除
      if (proposalId) {
        const res = await fetch(`/api/proposals/${proposalId}`);
        const json = await res.json();
        if (json.success) {
          router.push(`/proposals/${proposalId}`);
        } else {
          // 提案不存在或已删除
          alert('该提案已被删除');
        }
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // 批量标记为已读
  const markSelectedAsRead = async () => {
    if (selectedIds.length === 0) return;

    try {
      await fetch('/api/messages/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msgIds: selectedIds }),
      });

      setMessages(prev => prev.map(m =>
        selectedIds.includes(m.msgId) ? { ...m, hasRead: 1 } : m
      ));
      setSelectedIds([]);

      // 触发自定义事件通知 Header 组件刷新未读数量
      window.dispatchEvent(new CustomEvent('messagesRead', { detail: { count: selectedIds.length } }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // 切换选择状态
  const toggleSelect = (msgId: number) => {
    setSelectedIds(prev =>
      prev.includes(msgId)
        ? prev.filter(id => id !== msgId)
        : [...prev, msgId]
    );
  };

  // 获取 informType 名称
  const getInformTypeName = (type: number) => {
    const types: Record<number, string> = {
      1: '附议邀请',
      2: '审批进度',
    };
    return types[type] || '系统消息';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">请先登录</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1779DC] text-white rounded-lg hover:bg-[#2861AE] transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 - 简洁白色背景 */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft size={20} className="text-gray-600" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Mail size={26} className="text-[#1779DC]" />
                站内信
              </h1>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={markSelectedAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-[#1779DC] text-white rounded-lg hover:bg-[#2861AE] transition-colors text-sm font-medium"
              >
                <CheckCheck size={16} />
                标记为已读 ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1779DC]"></div>
            <p className="text-gray-500 mt-4">加载中...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <Mail size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">暂无消息</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {messages.map((message) => (
              <div
                key={message.msgId}
                className={`flex items-start gap-4 p-5 border-b border-gray-100 last:border-0 transition-colors ${
                  message.hasRead === 0 ? 'bg-blue-50/50' : 'bg-white'
                }`}
              >
                {/* 复选框 */}
                <input
                  type="checkbox"
                  checked={selectedIds.includes(message.msgId)}
                  onChange={() => toggleSelect(message.msgId)}
                  className="mt-1 w-4 h-4 text-[#1779DC] rounded border-gray-300 focus:ring-[#1779DC]"
                />

                {/* 状态图标 */}
                <div className="mt-1">
                  {message.hasRead === 0 ? (
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  ) : (
                    <CheckCircle2 size={14} className="text-gray-300" />
                  )}
                </div>

                {/* 消息内容 */}
                <div className="flex-1 cursor-pointer" onClick={() => markAsRead(message.msgId, message.context?.proposalId)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {getInformTypeName(message.informType)}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={12} />
                          {message.time}
                        </span>
                      </div>
                      <h3 className={`font-semibold mb-1 ${message.hasRead === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                        {message.context?.title || '系统消息'}
                      </h3>
                      <p className="text-sm text-gray-600">{message.context?.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
