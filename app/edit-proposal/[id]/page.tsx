'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save, FileText, User, Phone, Mail, Loader2,
  ArrowLeft, Upload, Users, X, UsersIcon, AlertCircle, CheckCircle, Sparkles
} from 'lucide-react';
import FyrSelectModal from '@/components/FyrSelectModal';
import DepartSelectModal from '@/components/DepartSelectModal';

interface Tajzlx { tajzlxId: number; tajzlxm: string; }
interface JdhMember { id: string; name: string; depart: string; }
interface UserData { id: string; name: string; depart?: string; phone?: string; mail?: string; type?: string; stuid?: string; }

export default function EditProposalPage() {
  const params = useParams();
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 预览弹窗状态
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '', type: 1, category: '', department: '', proposer: '',
    phone: '', email: '', brief: '', analysis: '', suggest: '', fyr: '',
    management: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [fyrModalOpen, setFyrModalOpen] = useState(false);
  const [departModalOpen, setDepartModalOpen] = useState(false);
  const [categories, setCategories] = useState<Tajzlx[]>([]);
  const [selectedFyrList, setSelectedFyrList] = useState<JdhMember[]>([]);
  const [selectedDepartList, setSelectedDepartList] = useState<string[]>([]);

  useEffect(() => {
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
        const decodedStr = decodeURIComponent(userStr);
        const userData = JSON.parse(decodedStr);
        setUser(userData);
      } catch (e) {
        console.error('Parse user error:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (params.id && user) {
      fetchProposalDetail();
      fetchCategories();
    }
  }, [params.id, user]);

  // 当 fyr 改变时同步 selectedFyrList
  useEffect(() => {
    if (formData.fyr) {
      const parsed = parseFyrString(formData.fyr);
      setSelectedFyrList(parsed);
    } else {
      setSelectedFyrList([]);
    }
  }, [formData.fyr]);

  // 解析附议人字符串
  const parseFyrString = (fyrStr: string): JdhMember[] => {
    if (!fyrStr) return [];
    const endorsements = fyrStr.split('，').filter(f => f.trim());
    const result: JdhMember[] = [];
    endorsements.forEach(e => {
      const match = e.match(/^(.+?)\((.+?)\)$/);
      if (match) {
        result.push({ id: match[2], name: match[1], depart: '' });
      }
    });
    return result;
  };

  const fetchProposalDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/proposals/${params.id}`);
      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data;

        // 检查是否为未审核状态
        if (data.process !== 0) {
          setError('该提案已进入审核流程，无法编辑');
          setLoading(false);
          return;
        }

        // 检查是否超过30天
        if (data.createAt) {
          const createDate = new Date(data.createAt);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 30) {
            setError('该提案提交已超过30天，无法修改');
            setLoading(false);
            return;
          }
        }

        // 检查是否为提案所有者
        // 个人账号：通过 stuid 匹配；集体账号：通过 name 匹配
        let isOwner = false;
        if (user?.type === 'individual') {
          // 兼容新旧两种情况：
          // 1. 新提案：data.stuid === user.stuid (正确使用学号)
          // 2. 旧提案：data.stuid 存的是 parseInt(user.id) 的结果，需要数值比较
          const dataStuidStr = String(data.stuid).trim();
          const userIdNum = parseInt(user.id, 10);

          isOwner = dataStuidStr === user.stuid ||
                   dataStuidStr === user.id ||
                   (userIdNum > 0 && dataStuidStr === String(userIdNum));

          // Debug logging
          console.log('[Edit Proposal] Permission check:', {
            userType: user.type,
            userStuid: user.stuid,
            userId: user.id,
            userIdNum: userIdNum,
            dataStuid: data.stuid,
            dataStuidStr: dataStuidStr,
            isOwner,
          });
        } else {
          isOwner = !!user && data.name === user.name;
        }

        if (!isOwner) {
          setError('您无权编辑此提案。请确认您是提案的创建者。如果问题持续存在，请尝试重新登录。');
          setLoading(false);
          return;
        }

        setProposal(data);

        // 填充表单数据
        setFormData({
          title: data.title || '',
          type: data.type || 1,
          category: data.fl || '',
          department: data.depart || '',
          proposer: data.name || '',
          phone: data.phone || '',
          email: data.mail || '',
          brief: data.brief || '',
          analysis: data.analysis || '',
          suggest: data.suggest || '',
          fyr: data.fyr || '',
          management: data.management || '',
        });

        // 解析附议人
        if (data.fyr) {
          const fyrList = parseFyrString(data.fyr);
          setSelectedFyrList(fyrList);
        }

        // 解析附议部门
        if (data.fyrdepart) {
          setSelectedDepartList(data.fyrdepart.split('，').filter((d: string) => d.trim()));
        }
      } else {
        setError('提案不存在');
      }
    } catch (err) {
      console.error('Error fetching proposal:', err);
      setError('加载提案失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // 删除附议人
  const handleRemoveFyr = (id: string) => {
    const newList = selectedFyrList.filter(m => m.id !== id);
    setSelectedFyrList(newList);
    setFormData(prev => ({ ...prev, fyr: newList.map(s => `${s.name}(${s.id})`).join('，') }));
  };

  const handleFyrConfirm = (selected: JdhMember[]) => {
    setSelectedFyrList(selected);
    setFormData(prev => ({ ...prev, fyr: selected.map(s => `${s.name}(${s.id})`).join('，') }));
  };

  const handleDepartConfirm = (selected: string[]) => {
    setSelectedDepartList(selected);
  };

  // 打开预览弹窗
  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('请输入提案标题');
      return;
    }
    if (!formData.brief.trim()) {
      alert('请输入提案简介');
      return;
    }
    if (!formData.suggest.trim()) {
      alert('请输入改进建议');
      return;
    }

    // 个人提案须有不少于两名附议人
    if (formData.type === 1 && selectedFyrList.length < 2) {
      alert('个人提案须不少于两名教代会代表附议');
      return;
    }

    // 设置预览数据
    setPreviewData({
      title: formData.title,
      type: formData.type,
      typeText: formData.type === 1 ? '个人提案' : '集体提案',
      proposer: formData.proposer,
      brief: formData.brief,
      analysis: formData.analysis,
      suggest: formData.suggest,
      department: formData.department,
      fyr: formData.fyr,
      fyrList: selectedFyrList,
      fyrdepart: selectedDepartList.join('，'),
    });

    setShowPreviewModal(true);
  };

  // 确认保存
  const confirmSave = async () => {
    setShowPreviewModal(false);
    setSaving(true);
    setError('');

    try {
      const submitData = {
        title: formData.title,
        brief: formData.brief,
        analysis: formData.analysis,
        suggest: formData.suggest,
        management: formData.management || '',
        depart: formData.department,
        name: formData.proposer,
        phone: formData.phone,
        mail: formData.email,
        fyr: formData.fyr,
        fyrdepart: selectedDepartList.join('，'),
        fl: formData.category,
        type: formData.type,
        notifyEndorsers: true, // 通知附议人
      };

      const res = await fetch(`/api/proposals/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const json = await res.json();

      if (json.success) {
        // 显示成功消息
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          router.push('/my-proposals');
        }, 2000);
      } else {
        setError(json.error || '修改失败');
      }
    } catch (err) {
      console.error('Error updating proposal:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  if (loading) {
    return (
      <div style={{ background: '#F0F7FF', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: '#1779DC', margin: '0 auto 16px' }} />
          <p style={{ color: '#6B7280' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#F0F7FF', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: '#DC2626', marginBottom: '20px' }}>{error}</p>
          <Link
            href="/my-proposals"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', background: '#1779DC',
              color: 'white', borderRadius: '10px', textDecoration: 'none'
            }}
          >
            <ArrowLeft size={16} />返回我的提案
          </Link>
        </div>
      </div>
    );
  }

  const typeNames: Record<number, string> = { 1: '个人提案', 2: '集体提案' };

  return (
    <div style={{ background: '#F0F7FF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '20px 0',
        background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
        boxShadow: '0 2px 10px rgba(23, 121, 220, 0.15)'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
          <Link
            href="/my-proposals"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              color: 'white', textDecoration: 'none', marginBottom: '16px'
            }}
          >
            <ArrowLeft size={18} />返回我的提案
          </Link>
          <h1 style={{
            fontSize: '28px', fontWeight: 'bold', color: 'white',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <FileText size={32} />修改提案建议
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: '8px' }}>
            提案编号: TY{String(proposal?.tajyId).padStart(4, '0')}
          </p>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '900px', margin: '0 auto 40px', padding: '0 24px' }}>
        <form onSubmit={handlePreview} style={{
          background: 'white', borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(23, 121, 220, 0.12)',
          padding: '32px', marginTop: '-20px', position: 'relative', zIndex: 1
        }}>
          {/* 提案类型 - 禁用状态 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#6B7280', marginBottom: '8px' }}>
              提案类型
            </label>
            <div style={{ display: 'flex', gap: '16px', opacity: 0.6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
                <input
                  type="radio"
                  name="type"
                  value={1}
                  checked={formData.type === 1}
                  disabled
                  style={{ width: '18px', height: '18px', accentColor: '#9CA3AF' }}
                />
                <span style={{ color: '#6B7280' }}>个人提案</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'not-allowed' }}>
                <input
                  type="radio"
                  name="type"
                  value={2}
                  checked={formData.type === 2}
                  disabled
                  style={{ width: '18px', height: '18px', accentColor: '#9CA3AF' }}
                />
                <span style={{ color: '#6B7280' }}>集体提案</span>
              </label>
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>提案类型创建后不可修改</p>
          </div>

          {/* 提案标题 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              提案标题 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入提案标题"
              style={{
                width: '100%', padding: '12px 16px',
                border: '1px solid #D1D5DB', borderRadius: '10px',
                fontSize: '15px', transition: 'all 0.2s'
              }}
            />
          </div>

          {/* 提案人信息 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                提案人 <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.proposer}
                onChange={(e) => setFormData(prev => ({ ...prev, proposer: e.target.value }))}
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1px solid #D1D5DB', borderRadius: '10px',
                  fontSize: '15px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                联系电话
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="请输入联系电话"
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1px solid #D1D5DB', borderRadius: '10px',
                  fontSize: '15px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="请输入邮箱"
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1px solid #D1D5DB', borderRadius: '10px',
                  fontSize: '15px'
                }}
              />
            </div>
          </div>

          {/* 附议人选择 - 仅个人提案显示 */}
          {formData.type === 1 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                附议人 <span style={{ color: '#DC2626' }}>*</span>
                <span style={{ fontWeight: '400', color: '#6B7280', fontSize: '13px', marginLeft: '8px' }}>
                  （个人提案须不少于2名附议人）
                </span>
              </label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  readOnly
                  onClick={() => setFyrModalOpen(true)}
                  value={formData.fyr}
                  placeholder="单击选择附议人"
                  style={{
                    flex: 1, padding: '12px 16px',
                    border: '1px solid #D1D5DB', borderRadius: '10px',
                    fontSize: '15px', cursor: 'pointer',
                    background: '#F9FAFB'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFyrModalOpen(true)}
                  style={{
                    padding: '12px 20px', background: '#10B981',
                    color: 'white', borderRadius: '10px',
                    fontSize: '14px', fontWeight: '500', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Users size={16} />选择附议人
                </button>
              </div>

              {/* 已选择的附议人标签 */}
              {selectedFyrList.length > 0 && (
                <div style={{
                  padding: '12px',
                  background: '#F0FDF4',
                  borderRadius: '10px',
                  border: '1px solid #BBF7D0',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '13px', color: '#166534', fontWeight: '500', marginBottom: '8px' }}>
                    已选择 {selectedFyrList.length} 位附议人：
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedFyrList.map((member) => (
                      <span
                        key={member.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: 'white',
                          borderRadius: '20px',
                          fontSize: '14px'
                        }}
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveFyr(member.id)}
                          style={{
                            background: 'none', border: 'none',
                            color: 'white', cursor: 'pointer',
                            padding: 0, display: 'flex', alignItems: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 提案简介 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              提案简介 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={formData.brief}
              onChange={(e) => setFormData(prev => ({ ...prev, brief: e.target.value }))}
              placeholder="请简要描述您的提案建议（100字以内）"
              rows={2}
              style={{
                width: '100%', padding: '12px 16px',
                border: '1px solid #D1D5DB', borderRadius: '10px',
                fontSize: '15px', resize: 'vertical'
              }}
            />
          </div>

          {/* 现状分析 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              现状分析
            </label>
            <textarea
              value={formData.analysis}
              onChange={(e) => setFormData(prev => ({ ...prev, analysis: e.target.value }))}
              placeholder="请分析当前存在的问题或现状"
              rows={4}
              style={{
                width: '100%', padding: '12px 16px',
                border: '1px solid #D1D5DB', borderRadius: '10px',
                fontSize: '15px', resize: 'vertical'
              }}
            />
          </div>

          {/* 改进建议 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
              改进建议 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={formData.suggest}
              onChange={(e) => setFormData(prev => ({ ...prev, suggest: e.target.value }))}
              placeholder="请提出具体的改进建议"
              rows={6}
              style={{
                width: '100%', padding: '12px 16px',
                border: '1px solid #D1D5DB', borderRadius: '10px',
                fontSize: '15px', resize: 'vertical'
              }}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div style={{
              padding: '12px 16px', background: '#FEE2E2',
              color: '#DC2626', borderRadius: '10px', marginBottom: '24px'
            }}>
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link
              href="/my-proposals"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 32px', background: '#F3F4F6',
                color: '#374151', borderRadius: '12px',
                fontSize: '16px', fontWeight: '600', textDecoration: 'none'
              }}
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 32px', background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                color: 'white', borderRadius: '12px',
                fontSize: '16px', fontWeight: '600', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(23, 121, 220, 0.25)'
              }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>

      {/* Modals */}
      <FyrSelectModal isOpen={fyrModalOpen} onClose={() => setFyrModalOpen(false)}
        onConfirm={handleFyrConfirm} initialSelected={selectedFyrList} excludeId={user?.id} />
      <DepartSelectModal isOpen={departModalOpen} onClose={() => setDepartModalOpen(false)}
        onConfirm={handleDepartConfirm} initialSelected={selectedDepartList} />

      {/* 预览弹窗 */}
      {showPreviewModal && previewData && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '20px',
            maxWidth: '600px', width: '100%',
            maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* 弹窗标题 */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} style={{ color: '#F59E0B' }} />
                确认保存修改
              </h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} style={{ color: '#9CA3AF' }} />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Sparkles size={18} style={{ color: '#D97706' }} />
                  <span style={{ fontWeight: '600', color: '#92400E' }}>保存后将通知附议人</span>
                </div>
                <p style={{ fontSize: '14px', color: '#78350F', lineHeight: '1.5' }}>
                  确定保存后将通过站内信和企业微信通知所有附议人，告知提案内容已更新。
                </p>
              </div>

              {/* 提案预览 */}
              <div style={{
                background: '#F9FAFB',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>提案类型</span>
                  <div style={{ fontSize: '15px', color: '#1F2937', marginTop: '4px' }}>
                    {previewData.typeText}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>提案标题</span>
                  <div style={{ fontSize: '15px', color: '#1F2937', marginTop: '4px', fontWeight: '500' }}>
                    {previewData.title}
                  </div>
                </div>
                {previewData.brief && (
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>提案简介</span>
                    <div style={{ fontSize: '14px', color: '#4B5563', marginTop: '4px', lineHeight: '1.5' }}>
                      {previewData.brief}
                    </div>
                  </div>
                )}
                {previewData.suggest && (
                  <div>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>改进建议</span>
                    <div style={{ fontSize: '14px', color: '#4B5563', marginTop: '4px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {previewData.suggest}
                    </div>
                  </div>
                )}
              </div>

              {/* 附议人列表 */}
              {previewData.type === 1 && previewData.fyrList.length > 0 && (
                <div style={{
                  background: '#F0FDF4',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '13px', color: '#166534', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UsersIcon size={16} />
                    附议人 ({previewData.fyrList.length}人)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {previewData.fyrList.map((member: JdhMember) => (
                      <span
                        key={member.id}
                        style={{
                          padding: '6px 12px',
                          background: 'white',
                          color: '#166534',
                          borderRadius: '20px',
                          fontSize: '13px',
                          border: '1px solid #BBF7D0'
                        }}
                      >
                        {member.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部按钮 */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '10px',
                  fontSize: '15px', fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={confirmSave}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  fontSize: '15px', fontWeight: '500',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {saving ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功弹窗 */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '40px', textAlign: 'center', minWidth: '300px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#D1FAE5', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle size={36} style={{ color: '#10B981' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }}>
              修改成功！
            </h2>
            <p style={{ color: '#6B7280' }}>已通知附议人</p>
          </div>
        </div>
      )}
    </div>
  );
}
