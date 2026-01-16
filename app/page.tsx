'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { News, Proposal, FormalProposal, PROCESS_STATUS_MAP, PROPOSAL_PROCESS_STATUS_MAP, FORMAL_PROPOSAL_PROCESS_MAP } from '@/types';
import {
  FileText,
  Send,
  CheckCircle,
  Clock,
  ArrowRight,
  Calendar,
  ChevronDown,
  Sparkles,
  Users,
  TrendingUp,
  BookOpen,
  Megaphone,
  Loader2,
} from 'lucide-react';

// 从API获取数据
async function fetchNews() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/news?limit=4`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

async function fetchProposals() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/proposals?limit=10`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
}

async function fetchFormalProposals() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/formal-proposals?limit=10`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : [];
  } catch (error) {
    console.error('Error fetching formal proposals:', error);
    return [];
  }
}

async function fetchSystemParams() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/system`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (error) {
    console.error('Error fetching system params:', error);
    return null;
  }
}

async function fetchPageConfigs() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/settings/params`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (json.success && json.data.pageConfigs) {
      const configs: Record<string, string> = {};
      json.data.pageConfigs.forEach((config: { key: string; value: string }) => {
        configs[config.key] = config.value;
      });
      return configs;
    }
    return {};
  } catch (error) {
    console.error('Error fetching page configs:', error);
    return {};
  }
}

function getStatusBadge(process: number, type: 'proposal' | 'formal' = 'formal') {
  let statusMap;
  if (type === 'proposal') {
    statusMap = PROPOSAL_PROCESS_STATUS_MAP;
  } else if (type === 'formal') {
    statusMap = FORMAL_PROPOSAL_PROCESS_MAP;
  } else {
    statusMap = PROCESS_STATUS_MAP;
  }
  const status = statusMap[process] || '未知';

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    // 提案建议状态
    '未审核': { color: 'badge-neutral', icon: <Clock size={12} /> },
    '已立案': { color: 'badge-success', icon: <CheckCircle size={12} /> },
    '不立案': { color: 'badge-error', icon: <Clock size={12} /> },
    '处理中': { color: 'badge-info', icon: <Clock size={12} /> },
    // 正式提案状态
    '未处理': { color: 'badge-error', icon: <Clock size={12} /> },
    '正在处理': { color: 'badge-info', icon: <Clock size={12} /> },
    '处理完毕': { color: 'badge-success', icon: <CheckCircle size={12} /> },
    // 其他状态（保留兼容性）
    '已完成': { color: 'badge-success', icon: <CheckCircle size={12} /> },
    '已采纳': { color: 'badge-success', icon: <CheckCircle size={12} /> },
    '已回复': { color: 'badge-info', icon: <CheckCircle size={12} /> },
    '已受理': { color: 'badge-info', icon: <CheckCircle size={12} /> },
    '办理中': { color: 'badge-warning', icon: <Clock size={12} /> },
    '待处理': { color: 'badge-neutral', icon: <Clock size={12} /> },
  };
  const config = statusConfig[status] || { color: 'badge-neutral', icon: null };
  return (
    <span className={`badge ${config.color}`}>
      {config.icon}
      {status}
    </span>
  );
}

// 格式化正式提案编号：年份 + ZSTA + zstaId (3位)
function formatFormalProposalCode(proposal: FormalProposal) {
  const year = proposal.createAt ? new Date(new Date(proposal.createAt).getTime() + (8 * 60 * 60 * 1000)).getFullYear() : new Date().getFullYear();
  return `${year}ZSTA${String(proposal.zstaId).padStart(3, '0')}`;
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [news, setNews] = useState<News[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [formalProposals, setFormalProposals] = useState<FormalProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeImage, setHomeImage] = useState('/images/meeting.webp');
  const [pageConfigs, setPageConfigs] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [newsData, proposalsData, formalProposalsData, systemData, pageConfigsData] = await Promise.all([
        fetchNews(),
        fetchProposals(),
        fetchFormalProposals(),
        fetchSystemParams(),
        fetchPageConfigs(),
      ]);
      setNews(newsData);
      setProposals(proposalsData);
      setFormalProposals(formalProposalsData);
      if (systemData?.homeImage) {
        setHomeImage(systemData.homeImage);
      }
      setPageConfigs(pageConfigsData);
      setLoading(false);
    }
    loadData();
  }, []);

  // Scroll reveal animation - client only
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      {/* HERO SECTION */}
      <section className="hero-section relative bg-gradient-to-br from-[#F0F7FF] via-[#E8F2FF] to-[#F5F9FF]">
        {/* Animated background pattern */}
        <div className="hero-pattern relative z-10" />

        {/* Floating orbs */}
        <div className="hero-orb hero-orb-1 relative z-10" />
        <div className="hero-orb hero-orb-2 relative z-10" />
        <div className="hero-orb hero-orb-3 relative z-10" />

        {/* Hero Content */}
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="text-[#1779DC]">深圳大学</span>
            <br />
            教代会提案工作管理系统
          </h1>

          <p className="hero-subtitle">
            民主管理 · 参政议政 · 共建和谐校园
            <br />
            为教职工提供一个便捷、高效的提案提交与处理平台
          </p>

          {/* Hero CTA Buttons */}
          <div className="hero-cta">
            <Link href="/submit" className="btn-hero-primary btn-hero-pulse">
              <Send size={20} />
              提交提案建议
            </Link>
            <Link href="/formal-proposals" className="btn-hero-secondary">
              <FileText size={20} />
              浏览正式提案
            </Link>
          </div>

          {/* Hero Stats */}
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{formalProposals.length + 568}</div>
              <div className="hero-stat-label">正式提案</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{Math.floor((formalProposals.length + 568) * 0.57)}</div>
              <div className="hero-stat-label">已采纳</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">57%</div>
              <div className="hero-stat-label">采纳率</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">328</div>
              <div className="hero-stat-label">师生参与</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex flex-col items-center gap-3 animate-bounce cursor-pointer hover:scale-110 transition-transform" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
            <span className="text-sm font-semibold text-gray-600 bg-white/80 px-4 py-2 rounded-full shadow-lg border border-gray-200">
              向下滚动查看更多
            </span>
            <div className="w-10 h-10 bg-gradient-to-r from-[#1779DC] to-[#2861AE] rounded-full flex items-center justify-center shadow-lg text-white">
              <ChevronDown size={24} />
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS SECTION */}
      <section className="value-props-section">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="value-prop-card reveal-on-scroll">
              <div className="value-prop-number">1</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">便捷提交</h3>
              <p className="text-gray-600">随时随地在线提交提案建议，简化流程，提高效率</p>
            </div>
            <div className="value-prop-card reveal-on-scroll">
              <div className="value-prop-number">2</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">透明处理</h3>
              <p className="text-gray-600">实时跟踪提案处理进度，了解办理状态和答复意见</p>
            </div>
            <div className="value-prop-card reveal-on-scroll">
              <div className="value-prop-number">3</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">民主参与</h3>
              <p className="text-gray-600">保障教职工民主权利，共同参与学校建设与发展</p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="container mx-auto px-4 py-16">
        {/* 工作动态 */}
        <section className="mb-16 reveal-on-scroll">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl flex items-center justify-center shadow-lg">
                <Megaphone size={24} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">工作动态</h2>
            </div>
            <Link
              href="/news"
              className="text-[#1779DC] hover:text-[#2861AE] flex items-center gap-2 font-medium group transition-colors"
            >
              更多内容
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {pageConfigs.xwdt && <p className="text-gray-500 text-sm ml-15 mb-4">{pageConfigs.xwdt}</p>}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="text-[#1779DC] animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* 主图 - 链接到工作动态列表 */}
              <Link href="/news" className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 block">
                <img
                  src={homeImage}
                  alt="工作动态"
                  className="w-full h-auto rounded-2xl object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </Link>

              {news.length > 0 ? (
                <div className="space-y-3">
                  {news.slice(0, 4).map((item, index) => (
                    <Link
                      key={item.newsId}
                      href={`/news/${item.newsId}`}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-[#1779DC] hover:shadow-md transition-all group"
                    >
                      <span className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 rounded-xl flex items-center justify-center text-sm font-bold group-hover:bg-gradient-to-br group-hover:from-[#1779DC] group-hover:to-[#2861AE] group-hover:text-white transition-all shadow-sm">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 group-hover:text-[#1779DC] transition-colors line-clamp-1 font-medium">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                          <Calendar size={12} />
                          {item.createat?.split(' ')[0]}
                        </p>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 group-hover:text-[#1779DC] group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-gray-500">暂无工作动态</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 正式提案 & 提案建议 */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* 正式提案 */}
          <section className="reveal-on-scroll">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#1779DC] to-[#2861AE] rounded-xl flex items-center justify-center shadow-md">
                  <FileText size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">正式提案</h2>
              </div>
              <Link
                href="/formal-proposals"
                className="text-sm text-[#1779DC] hover:text-[#2861AE] flex items-center gap-1 font-medium group transition-colors"
              >
                更多
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            {pageConfigs.zsta && <p className="text-gray-500 text-sm ml-13 mb-3">{pageConfigs.zsta}</p>}

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="text-[#1779DC] animate-spin" />
              </div>
            ) : formalProposals.length > 0 ? (
              <div className="space-y-3">
                {formalProposals.slice(0, 5).map((proposal) => (
                  <Link
                    key={proposal.zstaId}
                    href={`/formal-proposals/${proposal.zstaId}`}
                    className="block p-4 rounded-xl bg-white border border-gray-100 hover:border-[#1779DC] hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-1.5 font-mono">{formatFormalProposalCode(proposal)}</p>
                        <p className="text-gray-800 group-hover:text-[#1779DC] transition-colors line-clamp-1 font-medium">
                          {proposal.title}
                        </p>
                      </div>
                      {getStatusBadge(proposal.process, 'formal')}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">暂无正式提案</p>
            )}
          </section>

          {/* 提案建议 */}
          <section className="reveal-on-scroll">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Send size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">提案建议</h2>
              </div>
              <Link
                href="/proposals"
                className="text-sm text-[#1779DC] hover:text-[#2861AE] flex items-center gap-1 font-medium group transition-colors"
              >
                更多
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            {pageConfigs.tajy && <p className="text-gray-500 text-sm ml-13 mb-3">{pageConfigs.tajy}</p>}

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={24} className="text-[#1779DC] animate-spin" />
              </div>
            ) : proposals.length > 0 ? (
              <div className="space-y-3">
                {proposals.slice(0, 5).map((proposal) => (
                  <Link
                    key={proposal.tajyId}
                    href={`/proposals/${proposal.tajyId}`}
                    className="block p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-1.5 font-mono">TY{String(proposal.tajyId).padStart(4, '0')}</p>
                        <p className="text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1 font-medium">
                          {proposal.title}
                        </p>
                      </div>
                      {getStatusBadge(proposal.process, 'proposal')}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">暂无提案建议</p>
            )}
          </section>
        </div>

        {/* 提交提案 CTA */}
        <section className="reveal-on-scroll">
          <Link href="/submit" className="block">
            <div className="relative rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer">
              {/* Background Image */}
              <div className="absolute inset-0">
                <img
                  src="/images/hero/A0EAF49460E54E46669D06CDD14_7A4A668C_3C9EF.jpg"
                  alt="征集提案建议"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="relative z-10 py-16 md:py-20 px-8 text-center text-white">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 shadow-2xl">
                    <Send className="text-white drop-shadow-md" size={36} />
                  </div>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-4 drop-shadow-xl">征集提案建议</h3>
                <p className="text-lg md:text-xl text-white flex items-center justify-center gap-2 max-w-2xl mx-auto drop-shadow-lg">
                  <Sparkles size={18} />
                  点击提交您的宝贵建议，共同建设美好校园
                </p>
              </div>

              {/* Hover Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </div>
          </Link>
        </section>

        {/* 关于提案工作 */}
        <section className="mt-16 reveal-on-scroll">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <BookOpen size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">关于提案工作</h2>
            </div>
            <Link
              href="/about"
              className="text-sm text-[#1779DC] hover:text-[#2861AE] flex items-center gap-1 font-medium group transition-colors"
            >
              更多
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          {pageConfigs.gytagz && <p className="text-gray-500 text-sm ml-13 mb-4">{pageConfigs.gytagz}</p>}

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { id: 1, title: '教代会提案工作办法', image: '/images/document.webp' },
              { id: 2, title: '提案处理流程说明', image: '/images/voting.webp' },
              { id: 3, title: '提案人权利与义务', image: '/images/teamwork.webp' },
            ].map((work) => (
              <Link
                key={work.id}
                href={`/about/${work.id}`}
                className="group p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-[#1779DC] hover:to-[#2861AE] hover:text-white transition-all duration-300 text-center border border-gray-200 hover:border-transparent shadow-sm hover:shadow-lg"
              >
                <div className="w-16 h-16 mx-auto mb-3 rounded-xl overflow-hidden shadow-md group-hover:scale-110 transition-transform">
                  <img
                    src={work.image}
                    alt={work.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-semibold line-clamp-1 group-hover:translate-y-[-2px] transition-transform">{work.title}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
