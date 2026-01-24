'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Send,
  TrendingUp,
  CheckCircle,
  Clock,
  Newspaper,
  Sparkles,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#1779DC', '#2861AE', '#4887D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface DashboardData {
  overview: {
    totalProposals: number;
    totalFormal: number;
    totalNews: number;
    thisMonthNew: number;
    pendingProposals: number;
    pendingFormal: number;
    conversionRate: number;
    aiConversionRate: number;
    aiConverted: number;
  };
  trends: {
    proposalTrend: number;
    formalTrend: number;
    monthlyTrend: Array<{ month: string; 提案建议: number; 正式提案: number }>;
  };
  distributions: {
    proposalStatus: Array<{ name: string; value: number }>;
    formalStatus: Array<{ name: string; value: number }>;
    proposalType: Array<{ name: string; value: number }>;
  };
  departmentStats: Array<{ name: string; value: number }>;
  categoryStats: Array<{ name: string; value: number }>;
  aiStats: {
    total: number;
    converted: number;
    rate: number;
  };
  recentActivity: Array<{
    id: number;
    title: string;
    time: string;
    type: 'proposal' | 'formal';
  }>;
  hotProposals: Array<{
    id: number;
    title: string;
    clickCount: number;
    depart: string;
    name: string;
  }>;
  endorserDistribution: Array<{
    id: number;
    title: string;
    endorserCount: number;
    depart: string;
    name: string;
  }>;
  yearlyComparison: Array<{
    year: string;
    提案建议: number;
    正式提案: number;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  // 统计卡片组件
  const StatCard = ({
    title,
    value,
    icon,
    color,
    trend,
    trendValue,
    suffix = '',
    formula,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
    suffix?: string;
    formula?: string;
  }) => (
    <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">
            {loading ? '-' : value}{suffix}
          </p>
          {trendValue !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend === 'up' && <ArrowUp size={14} />}
              {trend === 'down' && <ArrowDown size={14} />}
              <span>{Math.abs(trendValue)}% 较上月</span>
            </div>
          )}
          {formula && (
            <p className="text-xs text-gray-400 mt-2" title={formula}>
              {formula.length > 20 ? formula.slice(0, 20) + '...' : formula}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">工作台</h1>
          <p className="text-gray-500 mt-1">数据总览与分析</p>
        </div>
        <div className="text-sm text-gray-500" suppressHydrationWarning>
          最后更新: <span suppressHydrationWarning>{new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="提案建议总数"
          value={data?.overview.totalProposals || 0}
          icon={<Send size={24} />}
          color="from-blue-500 to-blue-600"
          trend={(data?.trends.proposalTrend ?? 0) > 0 ? 'up' : (data?.trends.proposalTrend ?? 0) < 0 ? 'down' : 'neutral'}
          trendValue={data?.trends.proposalTrend ?? 0}
        />
        <StatCard
          title="正式提案总数"
          value={data?.overview.totalFormal || 0}
          icon={<FileText size={24} />}
          color="from-green-500 to-green-600"
          trend={(data?.trends.formalTrend ?? 0) > 0 ? 'up' : (data?.trends.formalTrend ?? 0) < 0 ? 'down' : 'neutral'}
          trendValue={data?.trends.formalTrend ?? 0}
        />
        <StatCard
          title="待处理事项"
          value={(data?.overview.pendingProposals || 0) + (data?.overview.pendingFormal || 0)}
          icon={<Clock size={24} />}
          color="from-amber-500 to-amber-600"
        />
        <StatCard
          title="本月新增"
          value={data?.overview.thisMonthNew || 0}
          icon={<TrendingUp size={24} />}
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* 第二行统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="转化率"
          value={data?.overview.conversionRate || 0}
          icon={<TrendingUp size={24} />}
          color="from-cyan-500 to-cyan-600"
          suffix="%"
          formula="正式提案数 / 提案建议数 × 100%"
        />
        <StatCard
          title="AI转化提案"
          value={data?.overview.aiConverted || 0}
          icon={<Sparkles size={24} />}
          color="from-violet-500 to-violet-600"
          formula="通过AI合并生成的正式提案数量"
        />
        <StatCard
          title="工作动态"
          value={data?.overview.totalNews || 0}
          icon={<Newspaper size={24} />}
          color="from-rose-500 to-rose-600"
          formula="已发布的新闻动态总数"
        />
        <StatCard
          title="AI转化率"
          value={data?.overview.aiConversionRate || 0}
          icon={<Sparkles size={24} />}
          color="from-indigo-500 to-indigo-600"
          suffix="%"
          formula="AI转化提案数 / 正式提案总数 × 100%"
        />
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度提案趋势 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">近12个月提案趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.trends.monthlyTrend || []}>
              <defs>
                <linearGradient id="colorProposals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1779DC" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#1779DC" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  const parts = value.split('-');
                  return `${parts[0]}.${parts[1]}`;
                }}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => {
                  const parts = value.split('-');
                  return `${parts[0]}年${parts[1]}月`;
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="提案建议"
                stroke="#1779DC"
                fillOpacity={1}
                fill="url(#colorProposals)"
              />
              <Area
                type="monotone"
                dataKey="正式提案"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorFormal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 部门提案排行 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">部门提案数量 TOP 10</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data?.departmentStats || []}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#9CA3AF"
                fontSize={11}
                width={80}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#1779DC" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 历年数据对比和月度折线图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 历年提案数据对比 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">历年提案数据对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.yearlyComparison || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="year"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value}年`}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => `${value}年`}
              />
              <Legend />
              <Bar dataKey="提案建议" fill="#1779DC" radius={[4, 4, 0, 0]} />
              <Bar dataKey="正式提案" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 月度提案趋势（折线图） */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">月度提案趋势（折线图）</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data?.trends.monthlyTrend || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  const parts = value.split('-');
                  return `${parts[1]}月`;
                }}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => {
                  const parts = value.split('-');
                  return `${parts[0]}年${parts[1]}月`;
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="提案建议"
                stroke="#1779DC"
                strokeWidth={2}
                dot={{ fill: '#1779DC', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="正式提案"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 状态分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 提案建议状态分布 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">提案建议状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data?.distributions.proposalStatus || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {(data?.distributions.proposalStatus || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 正式提案状态分布 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">正式提案状态分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data?.distributions.formalStatus || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {(data?.distributions.formalStatus || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 提案类型分布 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">提案类型分布</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data?.distributions.proposalType || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {(data?.distributions.proposalType || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 第九届二次教代会提案分类统计 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800">第九届二次教代会提案建议立案及处理情况概述</h3>
            <p className="text-sm text-gray-500 mt-1">2025年4月召开的第九届二次教代会，共征集到提案建议48条</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#1779DC]">48</p>
              <p className="text-xs text-gray-500">提案总数</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">14</p>
              <p className="text-xs text-gray-500">立案数</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">29.17%</p>
              <p className="text-xs text-gray-500">立案率</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 饼图 */}
          <div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={[
                    { name: '后勤服务', value: 18 },
                    { name: '人事职称', value: 10 },
                    { name: '生活福利', value: 10 },
                    { name: '改革发展', value: 3 },
                    { name: '教学科研', value: 3 },
                    { name: '人才培养', value: 1 },
                    { name: '校园交通', value: 1 },
                    { name: '行政事务', value: 1 },
                    { name: '财务报账', value: 1 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(1)}% ${name}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#1779DC" />
                  <Cell fill="#2861AE" />
                  <Cell fill="#4887D4" />
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#8B5CF6" />
                  <Cell fill="#EC4899" />
                  <Cell fill="#6366F1" />
                  <Cell fill="#14B8A6" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    const val = value ?? 0;
                    const percent = (val / 48 * 100).toFixed(2);
                    return `${name ?? ''}: ${val}项 (${percent}%)`;
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 统计列表 */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">提案总数</p>
                <p className="text-3xl font-bold text-[#1779DC]">48</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">立案数量</p>
                <p className="text-3xl font-bold text-green-600">14</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">未立案</p>
                <p className="text-3xl font-bold text-amber-600">34</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">分类明细</h4>
              <div className="space-y-2">
                {[
                  { name: '后勤服务', value: 18, percent: 37.50, color: 'bg-[#1779DC]' },
                  { name: '人事职称', value: 10, percent: 20.83, color: 'bg-[#2861AE]' },
                  { name: '生活福利', value: 10, percent: 20.83, color: 'bg-[#4887D4]' },
                  { name: '改革发展', value: 3, percent: 6.25, color: 'bg-[#10B981]' },
                  { name: '教学科研', value: 3, percent: 6.25, color: 'bg-[#F59E0B]' },
                  { name: '人才培养', value: 1, percent: 2.08, color: 'bg-[#8B5CF6]' },
                  { name: '校园交通', value: 1, percent: 2.08, color: 'bg-[#EC4899]' },
                  { name: '行政事务', value: 1, percent: 2.08, color: 'bg-[#6366F1]' },
                  { name: '财务报账', value: 1, percent: 2.08, color: 'bg-[#14B8A6]' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded ${item.color}`}></div>
                    <span className="flex-1 text-sm text-gray-700">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{item.value}</span>
                    <span className="text-sm text-gray-500 w-14 text-right">{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 新增可视化图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 提案热度 Top 10 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">提案热度 Top 10</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data?.hotProposals || []}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
              <YAxis
                type="category"
                dataKey="title"
                stroke="#9CA3AF"
                fontSize={10}
                width={120}
                tick={{ fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
                formatter={(value: number | undefined, name: string | undefined, props: any) => {
                  if (name === 'clickCount') return [`点击 ${value ?? 0}次`, '热度'];
                  return value ?? 0;
                }}
                labelFormatter={(label: string) => label.length > 20 ? label.slice(0, 20) + '...' : label}
              />
              <Bar
                dataKey="clickCount"
                fill="#F59E0B"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data: any) => {
                  window.location.href = `/proposals/${data.id}`;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 附议人数 Top 10 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">附议人数 Top 10</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data?.endorserDistribution || []}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
              <YAxis
                type="category"
                dataKey="title"
                stroke="#9CA3AF"
                fontSize={10}
                width={120}
                tick={{ fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
                formatter={(value: number | undefined) => [`${value ?? 0}人`, '附议人数']}
                labelFormatter={(label: string) => label.length > 20 ? label.slice(0, 20) + '...' : label}
              />
              <Bar
                dataKey="endorserCount"
                fill="#8B5CF6"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data: any) => {
                  window.location.href = `/proposals/${data.id}`;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 底部区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最新活动 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">最新活动</h3>
            <Link href="/admin/tajy" className="text-sm text-[#1779DC] hover:underline">
              查看全部
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-gray-500 py-8">加载中...</div>
            ) : !data?.recentActivity || data.recentActivity.length === 0 ? (
              <div className="text-center text-gray-500 py-8">暂无活动</div>
            ) : (
              data.recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={item.type === 'formal' ? `/admin/zsta/${item.id}` : `/admin/tajy/${item.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors block"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.type === 'formal' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {item.type === 'formal' ? (
                      <FileText size={18} className="text-green-600" />
                    ) : (
                      <Send size={18} className="text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{getRelativeTime(item.time)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* 待处理事项 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">待处理事项</h3>
            <span className="text-sm text-gray-500">
              共 {(data?.overview.pendingProposals || 0) + (data?.overview.pendingFormal || 0)} 项
            </span>
          </div>
          <div className="space-y-3">
            {(data?.overview.pendingProposals || 0) > 0 ? (
              <Link
                href="/admin/tajy"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {data?.overview.pendingProposals} 条提案待审核
                  </p>
                  <p className="text-xs text-gray-500">需要管理员审核处理</p>
                </div>
                <AlertCircle size={16} className="text-red-500" />
              </Link>
            ) : null}
            {(data?.overview.pendingFormal || 0) > 0 ? (
              <Link
                href="/admin/zsta"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {data?.overview.pendingFormal} 条正式提案待处理
                  </p>
                  <p className="text-xs text-gray-500">等待分配处理部门</p>
                </div>
                <Clock size={16} className="text-amber-500" />
              </Link>
            ) : null}
            {(data?.overview.pendingProposals || 0) === 0 && (data?.overview.pendingFormal || 0) === 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">暂无待处理事项</p>
                  <p className="text-xs text-gray-500">所有事项已处理完毕</p>
                </div>
                <CheckCircle size={16} className="text-green-500" />
              </div>
            )}
          </div>

          {/* 快捷操作 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-600 mb-3">快捷操作</h4>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/tajy/new"
                className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors text-sm"
              >
                <Send size={16} />
                新建提案
              </Link>
              <Link
                href="/admin/zsta/new"
                className="flex items-center justify-center gap-2 p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors text-sm"
              >
                <FileText size={16} />
                新建正式提案
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
