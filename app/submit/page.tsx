'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Send, FileText, User, Phone, Mail, CheckCircle2, XCircle, Loader2,
  ArrowLeft, Upload, Users, X, Search, ExternalLink, Paperclip, Bell, Wand2,
  AlertCircle,
} from 'lucide-react';
import FyrSelectModal from '@/components/FyrSelectModal';
import DepartSelectModal from '@/components/DepartSelectModal';

interface Tajzlx { tajzlxId: number; tajzlxm: string; }
interface JdhMember { id: string; name: string; depart: string; }
interface UserData { id: string; name: string; depart?: string; phone?: string; mail?: string; type?: string; stuid?: string; }

// Diff 变化类型
interface DiffChange {
  type: 'same' | 'added' | 'removed';
  text: string;
}

// 单个修改段落
interface DiffSegment {
  id: string;
  original: string;
  originalBeforeApply: string; // 保存应用前的原文，用于撤销
  polished: string;
  diff: DiffChange[];
  hasChanges: boolean;
  applied: boolean; // 是否已应用
}

// AI 润色结果
interface PolishResult {
  fieldType: 'brief' | 'analysis' | 'suggest';
  original: string;
  polished: string;
  segments: DiffSegment[];  // 分段显示
}

export default function SubmitPage() {
  const router = useRouter();

  // Focus styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes breathe {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      @keyframes fadeInDown {
        from {
          opacity: 0;
          margin-top: '-10px';
        }
        to {
          opacity: 1;
          margin-top: '0';
        }
      }
      .diff-added {
        background: linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%);
        border-radius: 4px;
        padding: 2px 4px;
        color: #065F46;
        animation: breathe 2s ease-in-out infinite;
      }
      .diff-removed {
        background: linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%);
        border-radius: 4px;
        padding: 2px 4px;
        color: #991B1B;
        text-decoration: line-through;
        animation: breathe 2s ease-in-out infinite;
      }
      input:focus, textarea:focus, select:focus {
        border-color: #1779DC !important;
        box-shadow: 0 0 0 3px rgba(23, 121, 220, 0.15) !important;
        background: white !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const [user, setUser] = useState<UserData | null>(null);

  // Textarea 自动调整高度的函数
  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const [formData, setFormData] = useState({
    title: '', type: 1, category: '', department: '', proposer: '',
    phone: '', email: '', brief: '', analysis: '', suggest: '', fyr: '',
    relatedDepartments: '', // 相关职能部门
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fyrModalOpen, setFyrModalOpen] = useState(false);
  const [departModalOpen, setDepartModalOpen] = useState(false);
  const [categories, setCategories] = useState<Tajzlx[]>([]);
  const [selectedFyrList, setSelectedFyrList] = useState<JdhMember[]>([]);
  const [selectedDepartList, setSelectedDepartList] = useState<string[]>([]);

  // 字段验证错误状态
  const [fieldErrors, setFieldErrors] = useState<{
    brief?: string;
    analysis?: string;
    suggest?: string;
    fyr?: string;
    relatedDepartments?: string;
    email?: string;
    phone?: string;
  }>({});

  // 验证单个字段
  const validateField = (fieldName: 'brief' | 'analysis' | 'suggest' | 'fyr' | 'relatedDepartments' | 'email' | 'phone', value: string): string | null => {
    switch (fieldName) {
      case 'brief':
        if (value.trim().length === 0) return '请输入提案概述';
        if (value.trim().length < 50) return `提案概述不能低于50字（当前${value.trim().length}字）`;
        if (value.trim().length > 300) return `提案概述不能超过300字（当前${value.trim().length}字）`;
        return null;
      case 'analysis':
        if (value.trim().length === 0) return '请输入情况分析';
        if (value.trim().length < 50) return `情况分析不能低于50字（当前${value.trim().length}字）`;
        if (value.trim().length > 300) return `情况分析不能超过300字（当前${value.trim().length}字）`;
        return null;
      case 'suggest':
        if (value.trim().length === 0) return '请输入具体建议';
        if (value.trim().length < 30) return `具体建议不能低于30字（当前${value.trim().length}字）`;
        return null;
      case 'fyr':
        if (formData.type === 1 && selectedFyrList.length < 2) {
          return '个人提案须不少于两名教代会代表附议';
        }
        return null;
      case 'relatedDepartments':
        if (!value.trim()) return '请选择相关职能部门';
        return null;
      case 'email':
        if (!value.trim()) return '请输入邮箱';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return '请输入有效的邮箱地址';
        return null;
      case 'phone':
        if (!value.trim()) return '请输入电话';
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(value.trim())) return '请输入有效的手机号码';
        return null;
    }
  };

  // 验证所有字段
  const validateAllFields = (): boolean => {
    const errors: typeof fieldErrors = {};

    const briefError = validateField('brief', formData.brief);
    if (briefError) errors.brief = briefError;

    const analysisError = validateField('analysis', formData.analysis);
    if (analysisError) errors.analysis = analysisError;

    const suggestError = validateField('suggest', formData.suggest);
    if (suggestError) errors.suggest = suggestError;

    const fyrError = validateField('fyr', formData.fyr);
    if (fyrError) errors.fyr = fyrError;

    const relatedDepartmentsError = validateField('relatedDepartments', formData.relatedDepartments);
    if (relatedDepartmentsError) errors.relatedDepartments = relatedDepartmentsError;

    const emailError = validateField('email', formData.email);
    if (emailError) errors.email = emailError;

    const phoneError = validateField('phone', formData.phone);
    if (phoneError) errors.phone = phoneError;

    setFieldErrors(errors);

    // 如果有错误，滚动到第一个错误位置
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(`${firstErrorField}-field`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    return true;
  };
  // AI 润色相关状态
  const [polishingField, setPolishingField] = useState<'brief' | 'analysis' | 'suggest' | null>(null);
  const [polishResult, setPolishResult] = useState<PolishResult | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 查看类似提案相关状态
  const [searchingSimilar, setSearchingSimilar] = useState(false);
  const [similarProposals, setSimilarProposals] = useState<any[]>([]);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  // 一键填表相关状态
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillSuccess, setAutoFillSuccess] = useState(false);
  // 提案详情弹窗相关状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProposal, setDetailProposal] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // 提交预览弹窗相关状态
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    // 检查登录状态并加载用户信息
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr) as UserData;
      setUser(userData);

      // 自动填充用户信息
      setFormData(prev => ({
        ...prev,
        // 根据用户类型自动设置提案类型：个人账号只能提交个人提案，集体账号只能提交集体提案
        type: userData.type === 'department' ? 2 : 1,
        proposer: userData.name || '',
        phone: userData.phone || '',
        email: userData.mail || '',
        // 所属学院/部门始终使用用户所在部门
        department: userData.depart || '',
      }));
    } catch (e) {
      console.error('Parse user error:', e);
      router.push('/login');
      return;
    }

    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/tajzlx');
        const result = await response.json();
        if (result.success) setCategories(result.data);
      } catch (error) { console.error('获取提案分类失败:', error); }
    };
    fetchCategories();
  }, [router]);

  const proposalTypes = [
    { value: 1, label: '个人', icon: '👤', color: 'from-blue-500 to-blue-600' },
    { value: 2, label: '集体', icon: '👥', color: 'from-purple-500 to-purple-600' },
  ];

  // 解析 fyr 字符串为 JdhMember 列表
  const parseFyrString = (fyrStr: string): JdhMember[] => {
    if (!fyrStr.trim()) return [];
    return fyrStr.split('，')
      .filter(s => s.trim())
      .map(s => {
        const match = s.match(/^(.+)\((\d+)\)$/);
        if (match) {
          return { id: match[2], name: match[1], depart: '' };
        }
        return null;
      })
      .filter((m): m is JdhMember => m !== null);
  };

  // 当 fyr 改变时同步 selectedFyrList
  useEffect(() => {
    if (formData.fyr) {
      const parsed = parseFyrString(formData.fyr);
      setSelectedFyrList(parsed);
    } else {
      setSelectedFyrList([]);
    }
  }, [formData.fyr]);

  // 错误提示4秒后自动消失
  useEffect(() => {
    if (submitError) {
      const timer = setTimeout(() => {
        setSubmitError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [submitError]);

  // 删除附议人
  const handleRemoveFyr = (id: string) => {
    const newList = selectedFyrList.filter(m => m.id !== id);
    setSelectedFyrList(newList);
    setFormData({ ...formData, fyr: newList.map(s => `${s.name}(${s.id})`).join('，') });
  };

  const handleFyrConfirm = (selected: JdhMember[]) => {
    setSelectedFyrList(selected);
    setFormData({ ...formData, fyr: selected.map(s => `${s.name}(${s.id})`).join('，') });
  };

  const handleDepartConfirm = (selected: string[]) => {
    setSelectedDepartList(selected);
    setFormData({ ...formData, relatedDepartments: selected.join('，') });
  };

  // 查看类似提案
  const handleSearchSimilar = async () => {
    if (!formData.title.trim()) {
      alert('请先输入提案标题');
      return;
    }

    setSearchingSimilar(true);
    try {
      const res = await fetch(`/api/proposals/search-similar?title=${encodeURIComponent(formData.title.trim())}`);
      const json = await res.json();

      if (json.success) {
        setSimilarProposals(json.data);
        setShowSimilarModal(true);
      } else {
        alert('搜索失败');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('搜索失败，请稍后重试');
    } finally {
      setSearchingSimilar(false);
    }
  };

  // 一键填表
  const handleAutoFill = async () => {
    if (!formData.title.trim()) {
      alert('请先输入提案标题');
      return;
    }

    setAutoFilling(true);
    try {
      const res = await fetch('/api/ai/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title.trim() }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        const { brief, analysis, suggest, category, relatedDepartments } = json.data;

        // 填充提案内容
        if (brief) setFormData(prev => ({ ...prev, brief }));
        if (analysis) setFormData(prev => ({ ...prev, analysis }));
        if (suggest) setFormData(prev => ({ ...prev, suggest }));

        // 选择提案分类
        if (category && categories.length > 0) {
          const matchedCategory = categories.find(c => c.tajzlxm === category || c.tajzlxm.includes(category));
          if (matchedCategory) {
            setFormData(prev => ({ ...prev, category: matchedCategory.tajzlxm }));
          }
        }

        // 选择相关职能部门
        if (relatedDepartments) {
          // 解析相关部门字符串，同步更新 selectedDepartList
          const departArray = relatedDepartments.split('，').filter((d: string) => d.trim());
          setSelectedDepartList(departArray);
          setFormData(prev => ({ ...prev, relatedDepartments }));
        }

        // 显示成功动画
        setAutoFillSuccess(true);
        setTimeout(() => setAutoFillSuccess(false), 2000);
      } else {
        alert(json.error || 'AI填表失败，请稍后重试');
      }
    } catch (error) {
      console.error('Auto fill error:', error);
      alert('AI填表失败，请稍后重试');
    } finally {
      setAutoFilling(false);
    }
  };

  // AI 润色文本 - 存储结果并显示在侧边栏
  const handlePolish = async (fieldType: 'brief' | 'analysis' | 'suggest') => {
    const fieldNames = {
      brief: '提案概述',
      analysis: '情况分析',
      suggest: '具体建议',
    };
    const fieldKeys = {
      brief: 'brief',
      analysis: 'analysis',
      suggest: 'suggest',
    } as const;

    const text = formData[fieldKeys[fieldType]];
    if (!text || text.trim().length === 0) {
      alert(`请先输入${fieldNames[fieldType]}内容`);
      return;
    }

    if (text.trim().length < 10) {
      alert(`${fieldNames[fieldType]}内容太少，无需润色`);
      return;
    }

    setPolishingField(fieldType);
    try {
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fieldType }),
      });
      const json = await res.json();

      if (json.success) {
        // 分段处理：按句子分割
        const segments = createSegments(text, json.data);
        setPolishResult({
          fieldType,
          original: text,
          polished: json.data,
          segments,
        });
        // 打开侧边栏
        setSidebarOpen(true);
      } else {
        alert(json.error || 'AI 润色失败，请稍后重试');
      }
    } catch (error) {
      console.error('Polish error:', error);
      alert('AI 润色失败，请稍后重试');
    } finally {
      setPolishingField(null);
    }
  };

  // 计算 diff（改进的算法，按词比较而非按字符）
  const computeDiff = (original: string, modified: string): DiffChange[] => {
    const result: DiffChange[] = [];
    const originalWords = original.split(/(\s+)/);
    const modifiedWords = modified.split(/(\s+)/);

    let i = 0;
    let j = 0;

    while (i < originalWords.length || j < modifiedWords.length) {
      if (i < originalWords.length && j < modifiedWords.length && originalWords[i] === modifiedWords[j]) {
        result.push({ type: 'same', text: originalWords[i] });
        i++;
        j++;
      } else {
        // 尝试找到匹配
        let found = false;
        // 向前看
        for (let lookAhead = 1; lookAhead <= 5; lookAhead++) {
          if (j + lookAhead < modifiedWords.length && i < originalWords.length && originalWords[i] === modifiedWords[j + lookAhead]) {
            // 修改部分被删除
            let removedText = '';
            for (let k = 0; k < lookAhead; k++) {
              removedText += modifiedWords[j + k];
            }
            result.push({ type: 'removed', text: removedText });
            j += lookAhead;
            found = true;
            break;
          }
          if (i + lookAhead < originalWords.length && j < modifiedWords.length && originalWords[i + lookAhead] === modifiedWords[j]) {
            // 原文部分被删除
            let removedText = '';
            for (let k = 0; k < lookAhead; k++) {
              removedText += originalWords[i + k];
            }
            result.push({ type: 'removed', text: removedText });
            i += lookAhead;
            found = true;
            break;
          }
        }

        if (!found) {
          if (j < modifiedWords.length) {
            result.push({ type: 'added', text: modifiedWords[j] });
            j++;
          } else if (i < originalWords.length) {
            result.push({ type: 'removed', text: originalWords[i] });
            i++;
          }
        }
      }
    }

    // 合并连续相同类型的 diff
    const merged: DiffChange[] = [];
    for (const change of result) {
      if (merged.length > 0 && merged[merged.length - 1].type === change.type) {
        merged[merged.length - 1].text += change.text;
      } else {
        merged.push(change);
      }
    }

    return merged;
  };

  // 关闭侧边栏
  const closeSidebar = () => {
    setPolishResult(null);
    setSidebarOpen(false);
  };

  // 查看提案详情

  // 创建分段：将原文和润色后的文本按句子分割，并计算每段的 diff
  const createSegments = (original: string, polished: string): DiffSegment[] => {
    // 按句子分割（支持中文和英文句子）
    const sentenceSplitter = /([。！？.!?]+[\s\n]*)/;
    const originalSentences = original.split(sentenceSplitter).filter(s => s.trim());
    const polishedSentences = polished.split(sentenceSplitter).filter(s => s.trim());

    const segments: DiffSegment[] = [];
    let polishedIndex = 0;

    for (let i = 0; i < originalSentences.length; i++) {
      const originalSentence = originalSentences[i];
      // 尝试在润色结果中找到对应的句子
      let polishedSentence = '';

      // 简单匹配：使用编辑距离找最相似的句子
      let minDistance = Infinity;
      let bestMatch = '';

      for (let j = 0; j < polishedSentences.length; j++) {
        const dist = levenshteinDistance(originalSentence, polishedSentences[j]);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = polishedSentences[j];
        }
      }

      polishedSentence = bestMatch || originalSentence;

      // 计算该句子的 diff
      const diff = computeDiff(originalSentence, polishedSentence);
      const hasChanges = diff.some(d => d.type !== 'same');

      segments.push({
        id: `seg-${i}`,
        original: originalSentence,
        originalBeforeApply: originalSentence,
        polished: polishedSentence,
        diff,
        hasChanges,
        applied: false,
      });
    }

    // 如果润色后有新增的句子，也添加进来
    if (polishedSentences.length > originalSentences.length) {
      for (let i = originalSentences.length; i < polishedSentences.length; i++) {
        segments.push({
          id: `seg-${i}`,
          original: '',
          originalBeforeApply: '',
          polished: polishedSentences[i],
          diff: [{ type: 'added', text: polishedSentences[i] }],
          hasChanges: true,
          applied: false,
        });
      }
    }

    return segments;
  };

  // 简单的编辑距离算法（用于句子匹配）
  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = [];

    for (let i = 0; i <= m; i++) {
      dp[i] = [];
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
        }
      }
    }

    return dp[m][n];
  };

  // 应用单个段落的修改
  const applySegment = (segmentId: string) => {
    if (!polishResult) return;

    const fieldKeys = {
      brief: 'brief',
      analysis: 'analysis',
      suggest: 'suggest',
    } as const;

    // 找到对应的段落
    const segment = polishResult.segments.find(s => s.id === segmentId);
    if (!segment || segment.applied) return;

    // 将原文中的该段落替换为润色后的版本
    const currentText = formData[fieldKeys[polishResult.fieldType]];
    const newText = currentText.replace(segment.original, segment.polished);

    setFormData({ ...formData, [fieldKeys[polishResult.fieldType]]: newText });

    // 更新 polishResult，标记为已应用
    setPolishResult({
      ...polishResult,
      original: newText,
      segments: polishResult.segments.map(s =>
        s.id === segmentId
          ? { ...s, original: s.polished, applied: true }
          : s
      ),
    });
  };

  // 撤销单个段落的修改
  const undoSegment = (segmentId: string) => {
    if (!polishResult) return;

    const fieldKeys = {
      brief: 'brief',
      analysis: 'analysis',
      suggest: 'suggest',
    } as const;

    // 找到对应的段落
    const segment = polishResult.segments.find(s => s.id === segmentId);
    if (!segment || !segment.applied) return;

    // 将润色后的版本恢复为原文
    const currentText = formData[fieldKeys[polishResult.fieldType]];
    const newText = currentText.replace(segment.original, segment.originalBeforeApply);

    setFormData({ ...formData, [fieldKeys[polishResult.fieldType]]: newText });

    // 更新 polishResult，标记为未应用
    setPolishResult({
      ...polishResult,
      original: newText,
      segments: polishResult.segments.map(s =>
        s.id === segmentId
          ? { ...s, original: s.originalBeforeApply, applied: false }
          : s
      ),
    });
  };
  const handleViewProposal = async (proposal: any) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    setDetailProposal(null);

    try {
      // 根据提案类型调用不同的 API
      const apiUrl = proposal.proposalType === 'zsta'
        ? `/api/formal-proposals/${proposal.tajyId}`
        : `/api/proposals/${proposal.tajyId}`;

      const res = await fetch(apiUrl);
      const json = await res.json();

      if (json.success) {
        setDetailProposal({ ...json.data, proposalType: proposal.proposalType });
      } else {
        alert('获取提案详情失败');
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Fetch proposal error:', error);
      alert('获取提案详情失败');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // 打开提交预览弹窗
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // 全面验证所有字段
    if (!validateAllFields()) {
      setSubmitError('请修正表单中的错误后再提交');
      return;
    }

    // 打开预览弹窗
    setShowPreviewModal(true);
  };

  // 确认提交
  const confirmSubmit = async () => {
    setShowPreviewModal(false);
    setSubmitting(true);
    setSubmitError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('type', formData.type.toString());
      formDataToSend.append('depart', formData.department); // 所属学院/部门
      formDataToSend.append('relatedDepartments', formData.relatedDepartments); // 相关职能部门
      formDataToSend.append('name', formData.proposer);
      formDataToSend.append('stuid', user?.stuid || user?.id || ''); // 使用学号（stuid），没有则回退到 id
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('mail', formData.email);
      formDataToSend.append('brief', formData.brief);
      formDataToSend.append('analysis', formData.analysis);
      formDataToSend.append('suggest', formData.suggest);
      formDataToSend.append('fyr', formData.fyr);
      formDataToSend.append('context', formData.category);
      if (attachment) formDataToSend.append('attachment', attachment);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/proposals`, {
        method: 'POST', body: formDataToSend,
      });
      const result = await response.json();

      if (result.success) {
        setSubmitSuccess(true);
        setTimeout(() => router.push('/proposals'), 2000);
      } else {
        setSubmitError(result.error || '提交失败，请稍后重试');
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      setSubmitError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#F0F7FF', minHeight: '100vh' }}>
      {/* Success/Error Messages */}
      {submitSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <CheckCircle2 size={64} style={{ color: '#10B981', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }}>提交成功！</h3>
            <p style={{ color: '#6B7280' }}>正在跳转至提案列表...</p>
          </div>
        </div>
      )}

      {submitError && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#EF4444', color: 'white',
          padding: '12px 24px', borderRadius: '12px'
        }}>{submitError}</div>
      )}

      {/* Auto-fill success toast */}
      {autoFillSuccess && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#10B981', color: 'white',
          padding: '12px 24px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          animation: 'fadeInDown 0.3s ease-out'
        }}>
          <CheckCircle2 size={18} />
          <span>填表完成！</span>
        </div>
      )}

      {/* Modals */}
      <FyrSelectModal isOpen={fyrModalOpen} onClose={() => setFyrModalOpen(false)}
        onConfirm={handleFyrConfirm} initialSelected={selectedFyrList} excludeId={user?.id} />
      <DepartSelectModal isOpen={departModalOpen} onClose={() => setDepartModalOpen(false)}
        onConfirm={handleDepartConfirm} initialSelected={selectedDepartList} />

      {/* Hero Section */}
      <div style={{
        padding: '48px 0',
        background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(23, 121, 220, 0.2)'
      }}>
        {/* Decorative orbs */}
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
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto', padding: '40px 0 20px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '20px',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <Send size={40} style={{ color: 'white' }} />
            </div>
            <h1 style={{
              fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: '800', color: 'white',
              marginBottom: '16px', lineHeight: 1.2
            }}>征集提案建议</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', lineHeight: 1.8 }}>
              您的宝贵意见是我们改进工作的动力<br />
              共同建设美好校园，我们需要您的声音
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div style={{ maxWidth: '900px', margin: '-50px auto 48px', padding: '0 24px', position: 'relative', zIndex: 2 }}>
        <form onSubmit={handleSubmit} style={{
          background: 'white', borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(23, 121, 220, 0.08), 0 0 0 1px rgba(23, 121, 220, 0.05)',
          padding: '32px'
        }}>
          {/* Section 1 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '20px', fontWeight: 'bold', color: '#1F2937',
              marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F3F4F6',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={24} style={{ color: 'white' }} />
              </div>
              提案基本信息
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                * 提案建议标题：
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="text" required value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    flex: 1, padding: '14px 18px',
                    border: '2px solid #E5E7EB', borderRadius: '14px',
                    fontSize: '16px', outline: 'none',
                    borderColor: '#1779DC',
                    transition: 'all 0.2s ease',
                    background: '#F9FAFB'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearchSimilar}
                  disabled={searchingSimilar || !formData.title.trim()}
                  style={{
                    padding: '0 20px',
                    background: searchingSimilar ? '#9CA3AF' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: 'white',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: searchingSimilar || !formData.title.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    opacity: searchingSimilar || !formData.title.trim() ? 0.6 : 1,
                  }}
                >
                  {searchingSimilar ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  {searchingSimilar ? '搜索中...' : '查看类似提案'}
                </button>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={autoFilling || !formData.title.trim()}
                  style={{
                    padding: '0 20px',
                    background: autoFilling ? '#9CA3AF' : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                    color: 'white',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: autoFilling || !formData.title.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    opacity: autoFilling || !formData.title.trim() ? 0.6 : 1,
                  }}
                >
                  {autoFilling ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Wand2 size={16} />
                  )}
                  {autoFilling ? '填表中...' : '一键填表'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                  * 提案类型：
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {proposalTypes.map((type) => {
                    // 判断该选项是否被禁用
                    const isDisabled = user?.type === 'department' && type.value === 1 ||
                                       user?.type === 'individual' && type.value === 2;
                    return (
                      <div key={type.value} style={{ flex: 1 }}>
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setFormData({ ...formData, type: type.value })}
                          style={{
                            width: '100%', padding: '14px',
                            borderRadius: '14px', border: '2px solid #E5E7EB',
                            background: formData.type === type.value
                              ? 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)'
                              : isDisabled
                                ? '#F3F4F6'
                                : 'white',
                            color: formData.type === type.value
                              ? 'white'
                              : isDisabled
                                ? '#9CA3AF'
                                : '#374151',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                            boxShadow: formData.type === type.value && !isDisabled ? '0 4px 12px rgba(23, 121, 220, 0.25)' : 'none',
                            transform: formData.type === type.value && !isDisabled ? 'scale(1.02)' : 'scale(1)',
                            opacity: isDisabled ? 0.6 : 1
                          }}>
                          <span style={{ fontSize: '22px', display: 'block', marginBottom: '4px' }}>{type.icon}</span>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>{type.label}</span>
                        </button>
                        {formData.type === type.value && (
                          <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '6px', textAlign: 'center' }}>
                            {type.value === 1
                              ? '教代会代表以个人名义提出，须附议'
                              : '职能部门以集体名义提出，无须附议'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                  * 提案分类：
                </label>
                <select value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: '2px solid #E5E7EB', borderRadius: '14px',
                    fontSize: '16px', outline: 'none', cursor: 'pointer',
                    background: '#F9FAFB', appearance: 'none'
                  }}>
                  <option value="">请选择提案分类</option>
                  {categories.map((cat) => (
                    <option key={cat.tajzlxId} value={cat.tajzlxm}>{cat.tajzlxm}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                * 相关职能部门：
              </label>
              <div id="relatedDepartments-field">
                <input type="text" readOnly onClick={() => {
                  setDepartModalOpen(true);
                  // 选择后清除错误
                  if (fieldErrors.relatedDepartments) {
                    setFieldErrors({ ...fieldErrors, relatedDepartments: undefined });
                  }
                }}
                  value={formData.relatedDepartments} placeholder="单击选择职能部门"
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: fieldErrors.relatedDepartments ? '2px solid #EF4444' : '2px solid #E5E7EB',
                    borderRadius: '14px',
                    fontSize: '16px', outline: 'none', cursor: 'pointer',
                    background: 'white'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>
                  * 拟提交处理的相关职能部门名称
                </p>
                {fieldErrors.relatedDepartments && (
                  <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} />{fieldErrors.relatedDepartments}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '20px', fontWeight: 'bold', color: '#1F2937',
              marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F3F4F6',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={24} style={{ color: 'white' }} />
              </div>
              提案内容
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  * 提案概述：
                </label>
                <button
                  type="button"
                  onClick={() => handlePolish('brief')}
                  disabled={polishingField === 'brief' || !formData.brief.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: polishingField === 'brief' ? '#9CA3AF' : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                    color: 'white',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: polishingField === 'brief' || !formData.brief.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    opacity: !formData.brief.trim() ? 0.5 : 1,
                  }}
                >
                  {polishingField === 'brief' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  {polishingField === 'brief' ? '润色中...' : 'AI 润色'}
                </button>
              </div>
              <div id="brief-field">
                <textarea required value={formData.brief}
                  onChange={(e) => {
                    setFormData({ ...formData, brief: e.target.value });
                    autoResize(e);
                    // 实时清除错误
                    if (fieldErrors.brief) {
                      setFieldErrors({ ...fieldErrors, brief: undefined });
                    }
                  }}
                  onBlur={() => {
                    const error = validateField('brief', formData.brief);
                    if (error) {
                      setFieldErrors({ ...fieldErrors, brief: error });
                    }
                  }}
                  rows={1}
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: fieldErrors.brief ? '2px solid #EF4444' : '2px solid #E5E7EB',
                    borderRadius: '14px',
                    fontSize: '16px', outline: 'none', resize: 'none',
                    fontFamily: 'inherit', background: '#F9FAFB',
                    minHeight: '100px', overflow: 'hidden'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>
                  * 请简要介绍提案，不低于50字，不超过300字（当前{formData.brief.trim().length}字）
                </p>
                {fieldErrors.brief && (
                  <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} />{fieldErrors.brief}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  * 情况分析：
                </label>
                <button
                  type="button"
                  onClick={() => handlePolish('analysis')}
                  disabled={polishingField === 'analysis' || !formData.analysis.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: polishingField === 'analysis' ? '#9CA3AF' : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                    color: 'white',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: polishingField === 'analysis' || !formData.analysis.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    opacity: !formData.analysis.trim() ? 0.5 : 1,
                  }}
                >
                  {polishingField === 'analysis' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  {polishingField === 'analysis' ? '润色中...' : 'AI 润色'}
                </button>
              </div>
              <div id="analysis-field">
                <textarea required value={formData.analysis}
                  onChange={(e) => {
                    setFormData({ ...formData, analysis: e.target.value });
                    autoResize(e);
                    // 实时清除错误
                    if (fieldErrors.analysis) {
                      setFieldErrors({ ...fieldErrors, analysis: undefined });
                    }
                  }}
                  onBlur={() => {
                    const error = validateField('analysis', formData.analysis);
                    if (error) {
                      setFieldErrors({ ...fieldErrors, analysis: error });
                    }
                  }}
                  rows={1}
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: fieldErrors.analysis ? '2px solid #EF4444' : '2px solid #E5E7EB',
                    borderRadius: '14px',
                    fontSize: '16px', outline: 'none', resize: 'none',
                    fontFamily: 'inherit', background: '#F9FAFB',
                    minHeight: '100px', overflow: 'hidden'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>
                  * 请简要介绍提案事由，并就现状、问题等进行情况分析说明；不低于50字，不超过300字（当前{formData.analysis.trim().length}字）
                </p>
                {fieldErrors.analysis && (
                  <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} />{fieldErrors.analysis}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  * 具体建议：
                </label>
                <button
                  type="button"
                  onClick={() => handlePolish('suggest')}
                  disabled={polishingField === 'suggest' || !formData.suggest.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    background: polishingField === 'suggest' ? '#9CA3AF' : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                    color: 'white',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: polishingField === 'suggest' || !formData.suggest.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    opacity: !formData.suggest.trim() ? 0.5 : 1,
                  }}
                >
                  {polishingField === 'suggest' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  {polishingField === 'suggest' ? '润色中...' : 'AI 润色'}
                </button>
              </div>
              <div id="suggest-field">
                <textarea required value={formData.suggest}
                  onChange={(e) => {
                    setFormData({ ...formData, suggest: e.target.value });
                    autoResize(e);
                    // 实时清除错误
                    if (fieldErrors.suggest) {
                      setFieldErrors({ ...fieldErrors, suggest: undefined });
                    }
                  }}
                  onBlur={() => {
                    const error = validateField('suggest', formData.suggest);
                    if (error) {
                      setFieldErrors({ ...fieldErrors, suggest: error });
                    }
                  }}
                  rows={1}
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: fieldErrors.suggest ? '2px solid #EF4444' : '2px solid #E5E7EB',
                    borderRadius: '14px',
                    fontSize: '16px', outline: 'none', resize: 'none',
                    fontFamily: 'inherit', background: '#F9FAFB',
                    minHeight: '100px', overflow: 'hidden'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>
                  * 不低于30字（当前{formData.suggest.trim().length}字）
                </p>
                {fieldErrors.suggest && (
                  <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} />{fieldErrors.suggest}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                附件：
              </label>
              <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" id="attachment-upload"
                style={{ display: 'none' }} />
              <label htmlFor="attachment-upload" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 18px', border: '2px dashed #D1D5DB', borderRadius: '14px',
                cursor: 'pointer', color: '#6B7280',
                background: '#F9FAFB'
              }}>
                <Upload size={20} />
                <span>{attachment ? attachment.name : '点击上传附件'}</span>
              </label>
              <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '6px' }}>
                * 如需附上相关研究材料或佐证材料，请直接上传附件
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '20px', fontWeight: 'bold', color: '#1F2937',
              marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F3F4F6',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={24} style={{ color: 'white' }} />
              </div>
              提案人信息
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  * {formData.type === 2 ? '所属单位：' : '姓名：'}
                </label>
                <input type="text" required value={formData.proposer}
                  readOnly
                  style={{
                    width: '100%', padding: '14px 18px',
                    border: '2px solid #E5E7EB', borderRadius: '14px',
                    fontSize: '16px', outline: 'none', background: '#F3F4F6',
                    cursor: 'not-allowed', color: '#374151'
                  }}
                />
              </div>
              {/* 只有个人提案才显示所属学院/部门字段 */}
              {formData.type === 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    * 所属学院/部门：
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={user?.depart || ''}
                    style={{
                      width: '100%', padding: '14px 18px',
                      border: '2px solid #E5E7EB', borderRadius: '14px',
                      fontSize: '16px', outline: 'none',
                      background: '#F3F4F6',
                      cursor: 'not-allowed',
                      color: '#374151'
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div id="email-field">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  * 邮箱：
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={20} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF'
                  }} />
                  <input type="email" value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (fieldErrors.email) {
                        setFieldErrors({ ...fieldErrors, email: undefined });
                      }
                    }}
                    onBlur={() => {
                      const error = validateField('email', formData.email);
                      if (error) {
                        setFieldErrors({ ...fieldErrors, email: error });
                      }
                    }}
                    style={{
                      width: '100%', padding: '14px 18px 14px 48px',
                      border: fieldErrors.email ? '2px solid #EF4444' : '2px solid #E5E7EB',
                      borderRadius: '14px',
                      fontSize: '16px', outline: 'none', background: '#F9FAFB'
                    }}
                  />
                </div>
                {fieldErrors.email && (
                  <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} />{fieldErrors.email}
                  </p>
                )}
              </div>
              <div id="phone-field">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  * 电话：
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={20} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF'
                  }} />
                  <input type="tel" value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (fieldErrors.phone) {
                        setFieldErrors({ ...fieldErrors, phone: undefined });
                      }
                    }}
                    onBlur={() => {
                      const error = validateField('phone', formData.phone);
                      if (error) {
                        setFieldErrors({ ...fieldErrors, phone: error });
                      }
                    }}
                    style={{
                      width: '100%', padding: '14px 18px 14px 48px',
                      border: fieldErrors.phone ? '2px solid #EF4444' : '2px solid #E5E7EB',
                      borderRadius: '14px',
                      fontSize: '16px', outline: 'none', background: '#F9FAFB'
                    }}
                  />
                </div>
                {fieldErrors.phone && (
                  <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} />{fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Supporters */}
          {formData.type === 1 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '20px', fontWeight: 'bold', color: '#1F2937',
                marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F3F4F6',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Users size={24} style={{ color: 'white' }} />
                </div>
                * 附议人：
              </h3>

              <div id="fyr-field">
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <input type="text" readOnly onClick={() => setFyrModalOpen(true)}
                    value={formData.fyr} placeholder="单击选择附议人"
                    style={{
                      flex: 1, padding: '14px 18px',
                      border: fieldErrors.fyr ? '2px solid #EF4444' : '2px solid #E5E7EB',
                      borderRadius: '14px',
                      fontSize: '16px', outline: 'none', cursor: 'pointer',
                      background: 'white'
                    }}
                  />
                  <button type="button" onClick={() => {
                    setFyrModalOpen(true);
                    // 选择后清除错误
                    if (fieldErrors.fyr) {
                      setFieldErrors({ ...fieldErrors, fyr: undefined });
                    }
                  }}
                    style={{
                      padding: '14px 24px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white', borderRadius: '14px', border: 'none', cursor: 'pointer',
                      fontWeight: '600', fontSize: '14px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}>
                    选择
                  </button>
                </div>

              {/* 已选择的附议人标签 */}
              {selectedFyrList.length > 0 && (
                <div style={{
                  padding: '12px',
                  background: '#F0FDF4',
                  borderRadius: '12px',
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
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {member.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveFyr(member.id)}
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '0'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: '12px', color: '#DC2626' }}>
                * 根据规定个人提案须不少于两名教代会代表附议。系统将通过邮件自动提醒该附议人进行回应。经该代表同意确认才形成有效附议，同意署名的附议人将显示在前台。附议人在提案提交后不得修改。
              </p>
              {fieldErrors.fyr && (
                <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={14} />{fieldErrors.fyr}
                </p>
              )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', paddingTop: '16px', borderTop: '2px solid #F3F4F6' }}>
            <button type="button" onClick={() => router.back()}
              style={{
                padding: '14px 32px', border: '2px solid #E5E7EB', borderRadius: '14px',
                background: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '15px',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s ease'
              }}>
              <XCircle size={20} />重置
            </button>
            <button type="submit" disabled={submitting}
              style={{
                padding: '14px 48px', background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                color: 'white', borderRadius: '14px', border: 'none', cursor: 'pointer',
                fontWeight: '600', fontSize: '16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 20px rgba(23, 121, 220, 0.35)'
              }}>
              {submitting ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />提交中...
                </>
              ) : (
                <>
                  <Send size={20} />提交
                </>
              )}
            </button>
          </div>
        </form>

        {/* 征集提案建议的要求 */}
        <div style={{
          marginTop: '32px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          padding: '24px',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1F2937',
            marginBottom: '20px',
            paddingBottom: '12px',
            borderBottom: '2px solid #F3F4F6',
          }}>
            征集提案建议的要求
          </h3>
          <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#4B5563' }}>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#1F2937' }}>1. 基本原则</strong>
              <p style={{ marginTop: '8px' }}>
                提案建议应由教代会正式代表在各单位广泛征求群众意见的基础上，按"一事一案"原则提出。提案建议人（教代会正式代表）如有多个不同的提案建议事项，请按"一事一案"原则整理提出多项提案建议，其中每一项提案建议请尽可能只涉及1个相关的主要职能部门。
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#1F2937' }}>2. 主要内容</strong>
              <p style={{ marginTop: '8px' }}>
                提案内容应围绕学校改革发展、学科建设、教学科研、队伍建设、人才培养、行政管理、后勤服务、生活福利等内容进行情况分析、提出合理化建议和改进措施。与相关法律政策相抵触、缺乏建设性价值、不符合学校实际情况以及纯属个人问题等意见不予立案。
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#1F2937' }}>3. 形式要求</strong>
              <p style={{ marginTop: '8px' }}>
                提案应包括提案事由（情况分析）和具体解决建议等内容，其中提案事由不低于50字，不超过300字；"具体建议"不低于30字。建议如需附上相关研究材料或佐证材料，请直接上传附件。
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#1F2937' }}>4. 提案署名</strong>
              <p style={{ marginTop: '8px' }}>
                教代会提案建议可以由教代会代表个人提出（个人提案建议），也可以基层教代会名义集体提出集体提案建议。其中个人提案建议须两位以上（含两名）教代会代表附议，附议代表不限制在本单位内；集体提案建议需通过集体账号登录进入后填写提交。
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontStyle: 'italic', color: '#6B7280' }}>
                感谢每一位关心提案工作的教职工同仁的支持，教代会提案委员会将克服困难，尽快推进提案工作处理进度，推进提案工作的常态化和网络化。同时，教代会提案委员会希望和欢迎更多教职工志愿加入，参与后续其他提案的推进处理。
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ color: '#DC2626' }}>注意：方案提出后30天内可在"我的提案"中修改，过期或处理中不可修改。</strong>
            </div>
          </div>
        </div>

        {/* 类似提案弹窗 */}
        {showSimilarModal && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }} onClick={() => setShowSimilarModal(false)}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }} onClick={(e) => e.stopPropagation()}>
              {/* 头部 */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Search size={20} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937', margin: 0 }}>
                      类似提案
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      找到 {similarProposals.length} 条相似的提案
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSimilarModal(false)}
                  style={{
                    width: '32px', height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#F3F4F6',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={18} style={{ color: '#6B7280' }} />
                </button>
              </div>

              {/* 内容 */}
              <div style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
                {similarProposals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
                    <Search size={48} style={{ color: '#D1D5DB', marginBottom: '16px' }} />
                    <p>未找到类似的提案</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {similarProposals.map((proposal) => {
                      // 计算相似度百分比
                      const similarityPercent = proposal.similarity !== undefined
                        ? Math.round(proposal.similarity * 100)
                        : null;

                      // 根据相似度确定颜色
                      const getSimilarityColor = (score: number) => {
                        if (score >= 80) return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' };
                        if (score >= 60) return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
                        return { bg: '#E5E7EB', text: '#374151', border: '#9CA3AF' };
                      };
                      const similarityColor = similarityPercent !== null ? getSimilarityColor(similarityPercent) : null;

                      // 提案类型配置
                      const proposalType = proposal.proposalType || 'tajy';
                      const typeConfig = proposalType === 'zsta'
                        ? { label: '正式提案', color: '#10B981', bgColor: '#D1FAE5', prefix: 'ZS' }
                        : { label: '提案建议', color: '#1779DC', bgColor: '#DBEAFE', prefix: 'TY' };

                      return (
                        <button
                          key={`${proposalType}-${proposal.tajyId}`}
                          type="button"
                          onClick={() => handleViewProposal(proposal)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #E5E7EB',
                            background: '#F9FAFB',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F3F4F6';
                            e.currentTarget.style.borderColor = '#1779DC';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F9FAFB';
                            e.currentTarget.style.borderColor = '#E5E7EB';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                {/* 提案类型标签 */}
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  background: typeConfig.bgColor,
                                  color: typeConfig.color,
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                }}>
                                  {typeConfig.label}
                                </span>
                                {/* 编号 */}
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  color: '#6B7280',
                                  background: '#E5E7EB',
                                  padding: '2px 8px',
                                  borderRadius: '4px'
                                }}>
                                  {typeConfig.prefix}{String(proposal.tajybh).padStart(4, '0')}
                                </span>
                                {/* 日期 */}
                                <span style={{
                                  fontSize: '12px',
                                  color: '#6B7280'
                                }}>
                                  {proposal.createAt?.split(' ')[0]}
                                </span>
                                {/* 相似度标签 */}
                                {similarityPercent !== null && (
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    background: similarityColor!.bg,
                                    color: similarityColor!.text,
                                    border: `1px solid ${similarityColor!.border}`,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    相似度 {similarityPercent}%
                                  </span>
                                )}
                              </div>
                              <p style={{
                                fontSize: '15px',
                                fontWeight: '500',
                                color: '#1F2937',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {proposal.title}
                              </p>
                              {proposal.brief && (
                                <p style={{
                                  fontSize: '13px',
                                  color: '#6B7280',
                                  margin: '4px 0 0 0',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {proposal.brief}
                                </p>
                              )}
                            </div>
                            <ExternalLink size={18} style={{ color: '#1779DC', flexShrink: 0 }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 底部 */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #F3F4F6',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={() => setShowSimilarModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 提案详情弹窗 */}
        {showDetailModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }} onClick={(e) => {
            if (e.target === e.currentTarget) setShowDetailModal(false);
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
              {/* 头部 */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={24} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                      {detailProposal?.proposalType === 'zsta' ? '正式提案' : '提案建议'}详情
                    </h3>
                    <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                      {detailProposal?.proposalType === 'zsta'
                        ? `${new Date().getFullYear()}ZSTA${String(detailProposal?.zstaId || '').padStart(3, '0')}`
                        : `TY${String(detailProposal?.tajyId || '').padStart(4, '0')}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* 内容 */}
              <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
                {detailLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 16px', color: '#1779DC' }} />
                    <p>加载中...</p>
                  </div>
                ) : detailProposal ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 标题 */}
                    <div>
                      <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }}>
                        {detailProposal.title}
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6B7280' }}>
                        <span>{detailProposal.createAt || ''}</span>
                        {detailProposal.name && <span>提案人: {detailProposal.name}</span>}
                        {detailProposal.depart && <span>部门: {detailProposal.depart}</span>}
                      </div>
                    </div>

                    {/* 提案概述 */}
                    {detailProposal.brief && (
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                          提案概述
                        </h5>
                        <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.6', background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                          {detailProposal.brief}
                        </p>
                      </div>
                    )}

                    {/* 情况分析/事由 */}
                    {(detailProposal.analysis || detailProposal.reason) && (
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                          情况分析
                        </h5>
                        <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.6', background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                          {detailProposal.analysis || detailProposal.reason}
                        </p>
                      </div>
                    )}

                    {/* 具体建议 */}
                    {detailProposal.suggest && (
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                          具体建议
                        </h5>
                        <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.6', background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                          {detailProposal.suggest}
                        </p>
                      </div>
                    )}

                    {/* 办理答复 */}
                    {detailProposal.reply && (
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                          办理答复
                        </h5>
                        <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.6', background: '#EEF2FF', padding: '12px', borderRadius: '8px', border: '1px solid #C7D2FE' }}>
                          {detailProposal.reply}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* 底部 */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #F3F4F6',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: '#F9FAFB'
              }}>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  关闭
                </button>
                {detailProposal && (
                  <Link
                    href={detailProposal.proposalType === 'zsta'
                      ? `/formal-proposals/${detailProposal.tajyId}`
                      : `/proposals/${detailProposal.tajyId}`}
                    >
                    <button
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                    border: 'none',
                        background: 'linear-gradient(135deg, #1779DC 0%, #2861AE 100%)',
                        color: 'white',
                        fontWeight: '500',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      查看完整详情
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 提交预览弹窗 */}
        {showPreviewModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px'
          }} onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreviewModal(false);
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* 头部 */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Send size={24} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                      确认提交提案
                    </h3>
                    <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                      请核对您的提案信息
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* 内容 */}
              <div style={{ padding: '24px', flex: '1', minHeight: 0, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* 标题 */}
                  <div>
                    <h4 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '8px' }}>
                      {formData.title}
                    </h4>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#6B7280' }}>
                      <span>{formData.type === 1 ? '个人提案' : '集体提案'}</span>
                      {categories.find(c => c.tajzlxm === formData.category) && (
                        <span>分类: {categories.find(c => c.tajzlxm === formData.category)!.tajzlxm}</span>
                      )}
                    </div>
                  </div>

                  {/* 提案概述 */}
                  {formData.brief && (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        提案概述
                      </h5>
                      <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.6', background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                        {formData.brief}
                      </p>
                    </div>
                  )}

                  {/* 情况分析 */}
                  {formData.analysis && (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        情况分析
                      </h5>
                      <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.6', background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                        {formData.analysis}
                      </p>
                    </div>
                  )}

                  {/* 具体建议 */}
                  {formData.suggest && (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        具体建议
                      </h5>
                      <p style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.6', background: '#F9FAFB', padding: '12px', borderRadius: '8px' }}>
                        {formData.suggest}
                      </p>
                    </div>
                  )}

                  {/* 提案人信息 */}
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      提案人信息
                    </h5>
                    <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#4B5563' }}>
                      <p style={{ margin: '4px 0' }}>姓名: {formData.proposer}</p>
                      <p style={{ margin: '4px 0' }}>所属学院/部门: {user?.depart || ''}</p>
                      {formData.relatedDepartments && <p style={{ margin: '4px 0' }}>相关职能部门: {formData.relatedDepartments}</p>}
                      {formData.phone && <p style={{ margin: '4px 0' }}>电话: {formData.phone}</p>}
                      {formData.email && <p style={{ margin: '4px 0' }}>邮箱: {formData.email}</p>}
                    </div>
                  </div>

                  {/* 附议人 */}
                  {formData.type === 1 && selectedFyrList.length > 0 && (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        附议人 ({selectedFyrList.length}人)
                      </h5>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#F0FDF4', padding: '12px', borderRadius: '8px' }}>
                        {selectedFyrList.map((member) => (
                          <span
                            key={member.id}
                            style={{
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: 'white',
                              borderRadius: '20px',
                              fontSize: '14px'
                            }}
                          >
                            {member.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 附件 */}
                  {attachment && (
                    <div>
                      <h5 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        附件
                      </h5>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '12px', borderRadius: '8px', fontSize: '14px', color: '#4B5563' }}>
                        <Paperclip size={16} />
                        <span>{attachment.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 底部 */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #F3F4F6',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#F9FAFB',
                flexShrink: 0
              }}>
                {/* 企业微信通知提示 */}
                {selectedFyrList.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: '#EFF6FF',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#1D4ED8'
                  }}>
                    <Bell size={16} />
                    <span>提交后将向附议人发送企业微信消息通知</span>
                  </div>
                )}

                {/* 按钮组 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    disabled={submitting}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      background: 'white',
                      color: '#374151',
                      fontWeight: '500',
                      fontSize: '14px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.6 : 1
                    }}
                  >
                    返回修改
                  </button>
                  <button
                    onClick={confirmSubmit}
                    disabled={submitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: submitting ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      确认提交
                    </>
                  )}
                </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI 润色侧边栏 */}
        {sidebarOpen && polishResult && (
          <>
            {/* 遮罩层 */}
            <div
              onClick={closeSidebar}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
              }}
            />
            {/* 侧边栏 */}
            <div style={{
              position: 'fixed',
              top: '102px',
              right: 0,
              bottom: 0,
              width: '450px',
              background: 'white',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.3s ease',
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
            }}>
              {/* 头部 */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E5E7EB',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                color: 'white',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Wand2 size={24} />
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>AI 润色建议</h3>
                      <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                        {{
                          brief: '提案概述',
                          analysis: '情况分析',
                          suggest: '具体建议',
                        }[polishResult.fieldType]}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeSidebar}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* 图例 */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      background: '#D1FAE5',
                      border: '1px solid #10B981',
                      borderRadius: '3px',
                    }}></span>
                    新增内容
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      background: '#FEE2E2',
                      border: '1px solid #EF4444',
                      borderRadius: '3px',
                      textDecoration: 'line-through',
                    }}></span>
                    删除内容
                  </span>
                </div>
              </div>

              {/* 内容区域 - 分段显示修改 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
                  修改建议（{polishResult.segments.filter(s => s.hasChanges).length} 处修改）
                </h4>
                {polishResult.segments.map((segment, idx) => {
                  // 只显示有修改的段落
                  if (!segment.hasChanges) return null;

                  return (
                    <div
                      key={segment.id}
                      style={{
                        marginBottom: '16px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: segment.applied ? '1px solid #10B981' : '1px solid #C4B5FD',
                        background: segment.applied ? '#ECFDF5' : '#FAF5FF',
                      }}
                    >
                      {/* 段落标题 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: segment.applied ? '#059669' : '#7C3AED' }}>
                          修改 {polishResult.segments.filter((s, i) => i <= idx && s.hasChanges).length}
                        </span>
                        {!segment.applied ? (
                          <button
                            onClick={() => applySegment(segment.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={14} />
                            应用
                          </button>
                        ) : (
                          <button
                            onClick={() => undoSegment(segment.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              background: 'white',
                              color: '#6B7280',
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <XCircle size={14} />
                            撤销
                          </button>
                        )}
                      </div>

                      {/* 原文预览（带修改标记） */}
                      <div style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '1.8',
                        border: '1px solid #E5E7EB',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {segment.diff.map((change, cIdx) => {
                          if (change.type === 'same') {
                            return <span key={cIdx}>{change.text}</span>;
                          } else if (change.type === 'added') {
                            return <span key={cIdx} className="diff-added">{change.text}</span>;
                          } else {
                            return <span key={cIdx} className="diff-removed">{change.text}</span>;
                          }
                        })}
                      </div>

                      {/* 已应用提示 */}
                      {segment.applied && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <CheckCircle2 size={14} />
                          已应用
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 底部关闭按钮 */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #E5E7EB',
                background: '#F9FAFB',
                flexShrink: 0,
              }}>
                <button
                  onClick={closeSidebar}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: '#6B7280',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
