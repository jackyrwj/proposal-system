'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Proposal } from '@/types';
import {
  Send, Search, CheckCircle, Clock, ChevronLeft, ArrowRight,
  Loader2, User, Phone, FileText, Eye, AlertCircle, Trash2, Edit
} from 'lucide-react';
import { PROPOSAL_PROCESS_STATUS_MAP, PROPOSAL_TYPE_MAP } from '@/types';

export default function MyProposalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchForm, setSearchForm] = useState({ name: '', phone: '' });
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      input:focus, textarea:focus, select:focus {
        border-color: #1779DC !important;
        box-shadow: 0 0 0 3px rgba(23, 121, 220, 0.15) !important;
        background: white !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    // 检查是否已登录
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
        const userData = JSON.parse(decodedStr);
        setUser(userData);

        // 自动查询该用户的提案（个人和集体都查询）
        // 注意：提案表中的 stuid 字段存储的是学号，所以需要使用 userData.stuid
        if (userData.stuid || userData.id) {
          fetchUserProposals(userData.stuid || userData.id, userData.name, userData.type);
        }
      } catch (e) {
        console.error('Parse user error:', e);
      }
    }
  }, []);

  const fetchUserProposals = async (userId: string, userName?: string, userType?: string) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.append('userId', userId);
      if (userName) params.append('userName', userName);
      if (userType) params.append('userType', userType);

      const res = await fetch(`/api/my-proposals?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setProposals(json.data);
        setHasSearched(true);
      } else {
        setError(json.error || '查询失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchForm.name.trim() && !searchForm.phone.trim()) {
      setError('请输入姓名或手机号');
      return;
    }

    setError('');
    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (searchForm.name.trim()) params.append('name', searchForm.name.trim());
      if (searchForm.phone.trim()) params.append('phone', searchForm.phone.trim());

      const res = await fetch(`/api/my-proposals?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setProposals(json.data);
      } else {
        setError(json.error || '查询失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (proposalId: number, proposalTitle: string) => {
    if (!confirm(`确定要删除提案"${proposalTitle}"吗？此操作不可恢复。`)) {
      return;
    }

    setDeletingId(proposalId);

    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.success) {
        // 从列表中移除已删除的提案
        setProposals(prev => prev.filter(p => p.tajyId !== proposalId));
        // 如果是当前用户的提案，重新获取列表
        if (user?.stuid || user?.id) {
          fetchUserProposals(user.stuid || user.id, user.name, user.type);
        }
        alert('删除成功');
      } else {
        alert(json.error || '删除失败');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('删除失败，请稍后重试');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (process: number) => {
    const status = PROPOSAL_PROCESS_STATUS_MAP[process] || '未知';
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
      '未审核': { color: 'bg-gray-100 text-gray-600', icon: <Clock size={12} /> },
      '已立案': { color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
      '不立案': { color: 'bg-red-100 text-red-700', icon: <Clock size={12} /> },
      '处理中': { color: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
    };
    const config = statusMap[status] || { color: 'bg-gray-100 text-gray-600', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: number) => {
    const typeNames: Record<number, string> = { 1: '个人', 2: '集体' };
    const typeColors: Record<number, string> = {
      1: 'bg-orange-100 text-orange-700 border border-orange-200',
      2: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${typeColors[type] || 'bg-gray-100 text-gray-700'}`}>
        {typeNames[type] || '其他'}
      </span>
    );
  };

  // 检查提案是否超过30天
  const isOver30Days = (createAt: string | undefined): boolean => {
    if (!createAt) return false;
    const createDate = new Date(createAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  };

  // 未登录状态
  if (!user) {
    return (
      <div style={{ background: '#F0F7FF', minHeight: '100vh' }}>
        {/* Hero Section */}
        <div style={{
          padding: '48px 0',
          background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(23, 121, 220, 0.2)'
        }}>
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px',
            borderRadius: '50%', background: 'linear-gradient(135deg, #1779DC 0%, #4887D4 100%)',
            filter: 'blur(80px)', opacity: 0.4
          }} />
          <div style={{
            position: 'absolute', bottom: '-50px', left: '-50px', width: '300px', height: '300px',
            borderRadius: '50%', background: 'linear-gradient(135deg, #4887D4 0%, #2861AE 100%)',
            filter: 'blur(60px)', opacity: 0.3
          }} />

          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto', padding: '20px 0' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <FileText size={40} style={{ color: 'white' }} />
              </div>
              <h1 style={{
                fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: '800', color: 'white',
                marginBottom: '16px', lineHeight: 1.2
              }}>我的提案建议</h1>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', lineHeight: 1.8 }}>
                请先登录后查看您的提案建议及处理进度
              </p>
            </div>
          </div>
        </div>

        {/* Login Prompt */}
        <div style={{ maxWidth: '500px', margin: '0 auto 48px', padding: '0 24px', position: 'relative', zIndex: 2 }}>
          <div style={{
            background: 'white', borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(23, 121, 220, 0.08)',
            padding: '40px 32px', textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertCircle size={32} style={{ color: '#D97706' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '12px' }}>
              请先登录
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '28px', lineHeight: 1.6 }}>
              您需要登录后才能查看自己的提案建议
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '14px 32px', background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer',
                fontWeight: '600', fontSize: '16px',
                display: 'inline-flex', alignItems: 'center', gap: '8px'
              }}
            >
              <User size={18} />去登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#F0F7FF', minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{
        padding: '60px 0 80px',
        background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(23, 121, 220, 0.2)'
      }}>
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px',
          borderRadius: '50%', background: 'linear-gradient(135deg, #1779DC 0%, #4887D4 100%)',
          filter: 'blur(80px)', opacity: 0.4
        }} />
        <div style={{
          position: 'absolute', bottom: '-50px', left: '-50px', width: '300px', height: '300px',
          borderRadius: '50%', background: 'linear-gradient(135deg, #4887D4 0%, #2861AE 100%)',
          filter: 'blur(60px)', opacity: 0.3
        }} />

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto', padding: '20px 0' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <FileText size={36} style={{ color: 'white' }} />
            </div>
            <h1 style={{
              fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '800', color: 'white',
              marginBottom: '12px', lineHeight: 1.2
            }}>我的提案建议</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
              欢迎您，{user.name || user.id}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 48px', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <div style={{
          background: 'white', borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(23, 121, 220, 0.12)',
          overflow: 'hidden',
          marginTop: '-40px'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #F3F4F6',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937' }}>
              我的提案列表
            </h3>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              共找到 <strong style={{ color: '#1779DC' }}>{proposals.length}</strong> 条提案
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>编号</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>提案建议标题</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>类型</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>处理情况</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>提案时间</th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>操作</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid #F3F4F6' }}>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#1779DC' }} />
                      <p style={{ color: '#6B7280' }}>加载中...</p>
                    </td>
                  </tr>
                ) : proposals.length > 0 ? (
                  proposals.map((proposal, index) => (
                    <tr key={proposal.tajyId} style={{
                      borderBottom: '1px solid #F3F4F6',
                    }}>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#6B7280' }}>
                          TY{String(proposal.tajyId).padStart(4, '0')}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <Link
                          href={`/proposals/${proposal.tajyId}`}
                          style={{
                            color: '#1779DC', fontWeight: '500',
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          {proposal.title}
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        {getTypeBadge(proposal.type)}
                      </td>
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        {getStatusBadge(proposal.process)}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#6B7280', fontSize: '14px' }}>
                        {proposal.createAt || '-'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <Link
                            href={`/proposals/${proposal.tajyId}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '8px 14px', background: '#F0F7FF',
                              color: '#1779DC', borderRadius: '8px',
                              fontSize: '13px', fontWeight: '500',
                              textDecoration: 'none'
                            }}
                          >
                            <Eye size={14} />查看详情
                          </Link>
                          {/* 只有未审核且未超过30天的提案可以编辑和删除 */}
                          {proposal.process === 0 && !isOver30Days(proposal.createAt) && (
                            <>
                              <Link
                                href={`/edit-proposal/${proposal.tajyId}`}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '8px 14px', background: '#FEF3C7',
                                  color: '#D97706', borderRadius: '8px',
                                  fontSize: '13px', fontWeight: '500',
                                  textDecoration: 'none'
                                }}
                              >
                                <Edit size={14} />修改
                              </Link>
                              <button
                                onClick={() => handleDelete(proposal.tajyId, proposal.title)}
                                disabled={deletingId === proposal.tajyId}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '8px 14px', background: '#FEE2E2',
                                  color: '#DC2626', borderRadius: '8px',
                                  fontSize: '13px', fontWeight: '500',
                                  border: 'none', cursor: deletingId === proposal.tajyId ? 'not-allowed' : 'pointer',
                                  opacity: deletingId === proposal.tajyId ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => {
                                  if (deletingId !== proposal.tajyId) {
                                    e.currentTarget.style.background = '#FECACA';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#FEE2E2';
                                }}
                              >
                                <Trash2 size={14} />
                                {deletingId === proposal.tajyId ? '删除中...' : '删除'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#6B7280' }}>
                      暂无提案记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer - Add Proposal Button */}
          <div style={{
            padding: '20px 24px', borderTop: '1px solid #F3F4F6',
            display: 'flex', justifyContent: 'center'
          }}>
            <Link
              href="/submit"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px', background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                color: 'white', borderRadius: '12px',
                fontSize: '15px', fontWeight: '600',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(23, 121, 220, 0.25)'
              }}
            >
              <Send size={18} />提交新提案
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
