import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/admin/dashboard - 获取后台工作台统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取查询参数（时间筛选）
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建时间筛选条件
    let dateCondition = '';
    const dateParams: string[] = [];
    if (startDate && endDate) {
      dateCondition = ' AND createAt BETWEEN ? AND ?';
      dateParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else if (startDate) {
      dateCondition = ' AND createAt >= ?';
      dateParams.push(`${startDate} 00:00:00`);
    } else if (endDate) {
      dateCondition = ' AND createAt <= ?';
      dateParams.push(`${endDate} 23:59:59`);
    }

    // 获取当前时间，计算月份
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1).toISOString().slice(0, 7);

    // 并行获取所有统计数据
    const [
      // 基础统计数据（过滤已删除提案）
      totalProposals,
      totalFormal,
      totalNews,
      pendingProposals,
      pendingFormal,

      // 本月数据（过滤已删除提案）
      thisMonthProposals,
      thisMonthFormal,
      thisMonthNews,

      // 上月数据（用于计算趋势）
      lastMonthProposals,
      lastMonthFormal,

      // 提案建议状态分布（过滤已删除）
      proposalStatusDistribution,

      // 正式提案状态分布
      formalStatusDistribution,

      // 提案类型分布（个人/集体）（过滤已删除）
      proposalTypeDistribution,

      // 部门提案数量 Top 10（过滤已删除）
      departmentStats,

      // 提案分类统计（过滤已删除）
      categoryStats,

      // 近12个月提案趋势（过滤已删除）
      monthlyTrend,

      // AI转换统计
      aiConvertedStats,

      // 提案热度 Top 10（过滤已删除）
      hotProposals,

      // 附议人数分布（过滤已删除）
      endorserDistribution,

      // 匿名/实名提案统计（过滤已删除）
      anonymousStats,

      // 处理时长统计（过滤已删除）
      processingTimeStats,
    ] = await Promise.all([
      // 基础统计（带时间筛选，过滤已删除）
      query(`SELECT COUNT(*) as count FROM tajy WHERE deletedAt IS NULL${dateCondition}`, dateParams),
      query(`SELECT COUNT(*) as count FROM zsta WHERE 1=1${dateCondition}`, dateParams),
      query(`SELECT COUNT(*) as count FROM news WHERE 1=1${dateCondition.replace('createAt', 'createat')}`, dateParams),
      query(`SELECT COUNT(*) as count FROM tajy WHERE deletedAt IS NULL AND process = 0${dateCondition}`, dateParams),
      query(`SELECT COUNT(*) as count FROM zsta WHERE process = 0${dateCondition}`, dateParams),

      // 本月数据（过滤已删除）
      query(`SELECT COUNT(*) as count FROM tajy WHERE deletedAt IS NULL AND DATE_FORMAT(createAt, '%Y-%m') = ?`, [currentMonth]),
      query(`SELECT COUNT(*) as count FROM zsta WHERE DATE_FORMAT(createAt, '%Y-%m') = ?`, [currentMonth]),
      query(`SELECT COUNT(*) as count FROM news WHERE DATE_FORMAT(createat, '%Y-%m') = ?`, [currentMonth]),

      // 上月数据（过滤已删除）
      query(`SELECT COUNT(*) as count FROM tajy WHERE deletedAt IS NULL AND DATE_FORMAT(createAt, '%Y-%m') = ?`, [lastMonth]),
      query(`SELECT COUNT(*) as count FROM zsta WHERE DATE_FORMAT(createAt, '%Y-%m') = ?`, [lastMonth]),

      // 提案建议状态分布（过滤已删除）
      query(`
        SELECT process, COUNT(*) as count
        FROM tajy
        WHERE deletedAt IS NULL
        GROUP BY process
        ORDER BY process
      `),

      // 正式提案状态分布
      query(`
        SELECT process, COUNT(*) as count
        FROM zsta
        GROUP BY process
        ORDER BY process
      `),

      // 提案类型分布（过滤已删除）
      query(`
        SELECT type, COUNT(*) as count
        FROM tajy
        WHERE deletedAt IS NULL
        GROUP BY type
        ORDER BY type
      `),

      // 部门提案数量 Top 10（过滤已删除）
      query(`
        SELECT depart, COUNT(*) as count
        FROM tajy
        WHERE deletedAt IS NULL AND depart IS NOT NULL AND depart != ''${dateCondition}
        GROUP BY depart
        ORDER BY count DESC
        LIMIT 10
      `, dateParams),

      // 职能部门分类统计（过滤已删除）
      query(`
        SELECT
          CASE
            WHEN management IS NULL OR management = '' THEN '未分类'
            WHEN management LIKE '%后勤%' OR management LIKE '%食堂%' OR management LIKE '%物业%' THEN '后勤保障'
            WHEN management LIKE '%教务%' OR management LIKE '%教学%' THEN '教学科研'
            WHEN management LIKE '%人事%' OR management LIKE '%人事处%' THEN '人事制度'
            WHEN management LIKE '%学工%' OR management LIKE '%学生%' THEN '学生管理'
            WHEN management LIKE '%基建%' OR management LIKE '%校园%' OR management LIKE '%绿化%' THEN '校园建设'
            ELSE management
          END as category,
          COUNT(*) as count
        FROM tajy
        WHERE deletedAt IS NULL
        GROUP BY category
        ORDER BY count DESC
      `),

      // 近12个月提案趋势（过滤已删除）
      query(`
        SELECT
          DATE_FORMAT(createAt, '%Y-%m') as month,
          COUNT(*) as count
        FROM tajy
        WHERE deletedAt IS NULL AND createAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(createAt, '%Y-%m')
        ORDER BY month ASC
      `),

      // AI转换统计
      query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN sourceTajyIds IS NOT NULL AND sourceTajyIds != '' THEN 1 ELSE 0 END) as aiConverted
        FROM zsta
      `),

      // 提案热度 Top 10（过滤已删除）
      query(`
        SELECT tajyId, title, clickCount, depart, name
        FROM tajy
        WHERE deletedAt IS NULL${dateCondition}
        ORDER BY clickCount DESC
        LIMIT 10
      `, dateParams),

      // 附议人数 Top 10（过滤已删除）
      query(`
        SELECT
          tajyId,
          title,
          depart,
          name,
          CASE
            WHEN fyr IS NULL OR fyr = '' THEN 0
            ELSE LENGTH(fyr) - LENGTH(REPLACE(fyr, '，', '')) + 1
          END as endorserCount
        FROM tajy
        WHERE deletedAt IS NULL${dateCondition}
        ORDER BY endorserCount DESC
        LIMIT 10
      `, dateParams),

      // 匿名/实名提案统计（过滤已删除）
      query(`
        SELECT
          sfnm,
          COUNT(*) as count
        FROM tajy
        WHERE deletedAt IS NULL
        GROUP BY sfnm
      `),

      // 处理时长统计（过滤已删除）
      query(`
        SELECT
          tajyId,
          createAt,
          DATEDIFF(NOW(), createAt) as processingDays
        FROM tajy
        WHERE deletedAt IS NULL AND process IN (1, 3)
      `),
    ]);

    // 处理统计数据
    const totalProposalsCount = totalProposals[0]?.count || 0;
    const totalFormalCount = totalFormal[0]?.count || 0;
    const totalNewsCount = totalNews[0]?.count || 0;
    const pendingProposalsCount = pendingProposals[0]?.count || 0;
    const pendingFormalCount = pendingFormal[0]?.count || 0;

    const thisMonthProposalsCount = thisMonthProposals[0]?.count || 0;
    const thisMonthFormalCount = thisMonthFormal[0]?.count || 0;
    const thisMonthNewsCount = thisMonthNews[0]?.count || 0;

    const lastMonthProposalsCount = lastMonthProposals[0]?.count || 0;
    const lastMonthFormalCount = lastMonthFormal[0]?.count || 0;

    // 计算趋势百分比
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const proposalTrend = calculateTrend(thisMonthProposalsCount, lastMonthProposalsCount);
    const formalTrend = calculateTrend(thisMonthFormalCount, lastMonthFormalCount);

    // 处理状态分布数据
    const proposalStatusMap: Record<number, string> = { 0: '未审核', 1: '已立案', 2: '不立案', 3: '处理中' };
    const proposalStatusData = proposalStatusDistribution.map((item: any) => ({
      name: proposalStatusMap[item.process] || `状态${item.process}`,
      value: item.count,
    }));

    const formalStatusMap: Record<number, string> = { 0: '未处理', 1: '正在处理', 2: '处理完毕' };
    const formalStatusData = formalStatusDistribution.map((item: any) => ({
      name: formalStatusMap[item.process] || `状态${item.process}`,
      value: item.count,
    }));

    // 处理提案类型数据
    const proposalTypeMap: Record<number, string> = { 1: '个人提案', 2: '集体提案' };
    const proposalTypeData = proposalTypeDistribution.map((item: any) => ({
      name: proposalTypeMap[item.type] || `类型${item.type}`,
      value: item.count,
    }));

    // 处理部门数据
    const departmentData = departmentStats.map((item: any) => ({
      name: item.depart || '未知部门',
      value: item.count,
    }));

    // 处理提案分类数据
    const categoryData = categoryStats.map((item: any) => ({
      name: item.category || '未分类',
      value: item.count,
    }));

    // 处理月度趋势数据
    const monthlyData = monthlyTrend.map((item: any) => ({
      month: item.month,
      提案建议: item.count,
    }));

    // 补充正式提案的月度数据
    const formalMonthlyTrend = await query(`
      SELECT
        DATE_FORMAT(createAt, '%Y-%m') as month,
        COUNT(*) as count
      FROM zsta
      WHERE createAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(createAt, '%Y-%m')
      ORDER BY month ASC
    `);

    // 合并月度数据
    const mergedMonthlyData = new Map<string, { 提案建议: number; 正式提案: number }>();
    monthlyData.forEach(item => {
      mergedMonthlyData.set(item.month, { 提案建议: item.提案建议, 正式提案: 0 });
    });
    formalMonthlyTrend.forEach((item: any) => {
      const existing = mergedMonthlyData.get(item.month);
      if (existing) {
        existing.正式提案 = item.count;
      } else {
        mergedMonthlyData.set(item.month, { 提案建议: 0, 正式提案: item.count });
      }
    });

    const trendData = Array.from(mergedMonthlyData.entries())
      .map(([month, counts]) => ({ month, ...counts }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 处理AI转换数据
    const aiStats = aiConvertedStats[0];
    const aiConversionRate = aiStats?.total > 0
      ? Math.round((aiStats.aiConverted / aiStats.total) * 100)
      : 0;

    // 转化率（提案建议 -> 正式提案）
    const conversionRate = totalProposalsCount > 0
      ? Math.round((totalFormalCount / totalProposalsCount) * 100)
      : 0;

    // 最新活动数据（过滤已删除）
    const [recentProposals, recentFormal] = await Promise.all([
      query(`
        SELECT tajyId, title, createAt, 'tajy' as type
        FROM tajy
        WHERE deletedAt IS NULL
        ORDER BY createAt DESC
        LIMIT 5
      `),
      query(`
        SELECT zstaId, title, createAt, 'zsta' as type
        FROM zsta
        ORDER BY createAt DESC
        LIMIT 5
      `),
    ]);

    const recentActivity = [
      ...recentProposals.map((p: any) => ({
        id: p.tajyId,
        title: p.title,
        time: p.createAt,
        type: 'proposal',
      })),
      ...recentFormal.map((p: any) => ({
        id: p.zstaId,
        title: p.title,
        time: p.createAt,
        type: 'formal',
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

    // 处理热度数据
    const hotProposalsData = hotProposals.map((p: any) => ({
      id: p.tajyId,
      title: p.title,
      clickCount: p.clickCount || 0,
      depart: p.depart || '',
      name: p.name || '',
    }));

    // 处理附议人数 Top 10
    const endorserData = endorserDistribution.map((item: any) => ({
      id: item.tajyId,
      title: item.title,
      endorserCount: item.endorserCount || 0,
      depart: item.depart || '',
      name: item.name || '',
    }));

    // 处理匿名/实名数据
    const anonymousData = anonymousStats.map((item: any) => ({
      name: parseInt(item.sfnm) === 1 ? '匿名提案' : '实名提案',
      value: item.count,
    }));

    // 计算处理时长统计
    const validProcessingTimes = processingTimeStats
      .map((item: any) => item.processingDays)
      .filter((days: number | null) => days !== null && days >= 0);
    const avgProcessingDays = validProcessingTimes.length > 0
      ? Math.round(validProcessingTimes.reduce((a: number, b: number) => a + b, 0) / validProcessingTimes.length)
      : 0;

    // 处理时长分布
    const processingTimeDistribution = [
      { name: '0-7天', value: validProcessingTimes.filter((d: number) => d <= 7).length },
      { name: '8-30天', value: validProcessingTimes.filter((d: number) => d > 7 && d <= 30).length },
      { name: '31-90天', value: validProcessingTimes.filter((d: number) => d > 30 && d <= 90).length },
      { name: '90天以上', value: validProcessingTimes.filter((d: number) => d > 90).length },
    ].filter((item: any) => item.value > 0);

    // 获取历年提案数据（过滤已删除）
    const [yearlyTajy, yearlyZsta] = await Promise.all([
      query(`
        SELECT
          DATE_FORMAT(createAt, '%Y') as year,
          COUNT(*) as count
        FROM tajy
        WHERE deletedAt IS NULL AND createAt IS NOT NULL
        GROUP BY DATE_FORMAT(createAt, '%Y')
        ORDER BY year ASC
      `),
      query(`
        SELECT
          DATE_FORMAT(createat, '%Y') as year,
          COUNT(*) as count
        FROM zsta
        WHERE createat IS NOT NULL
        GROUP BY DATE_FORMAT(createat, '%Y')
        ORDER BY year ASC
      `),
    ]);

    // 处理历年数据
    const yearlyMap = new Map<string, { 提案建议: number; 正式提案: number }>();
    yearlyTajy.forEach((item: any) => {
      yearlyMap.set(item.year, { 提案建议: item.count, 正式提案: 0 });
    });
    yearlyZsta.forEach((item: any) => {
      const existing = yearlyMap.get(item.year);
      if (existing) {
        existing.正式提案 = item.count;
      } else {
        yearlyMap.set(item.year, { 提案建议: 0, 正式提案: item.count });
      }
    });

    const yearlyComparisonData = Array.from(yearlyMap.entries())
      .map(([year, counts]) => ({ year, ...counts }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return NextResponse.json({
      success: true,
      data: {
        // 概览卡片
        overview: {
          totalProposals: totalProposalsCount,
          totalFormal: totalFormalCount,
          totalNews: totalNewsCount,
          thisMonthNew: thisMonthProposalsCount + thisMonthFormalCount,
          pendingProposals: pendingProposalsCount,
          pendingFormal: pendingFormalCount,
          conversionRate,
          aiConversionRate,
          aiConverted: aiStats?.aiConverted || 0,
        },

        // 趋势数据
        trends: {
          proposalTrend,
          formalTrend,
          monthlyTrend: trendData,
        },

        // 状态分布
        distributions: {
          proposalStatus: proposalStatusData,
          formalStatus: formalStatusData,
          proposalType: proposalTypeData,
        },

        // 部门统计
        departmentStats: departmentData,

        // 提案分类统计
        categoryStats: categoryData,

        // AI转换统计
        aiStats: {
          total: aiStats?.total || 0,
          converted: aiStats?.aiConverted || 0,
          rate: aiConversionRate,
        },

        // 最新活动
        recentActivity,

        // 提案热度 Top 10
        hotProposals: hotProposalsData,

        // 附议人数分布
        endorserDistribution: endorserData,

        // 匿名/实名提案分布
        anonymousDistribution: anonymousData,

        // 处理时长统计
        processingTime: {
          avgDays: avgProcessingDays,
          distribution: processingTimeDistribution,
        },

        // 转化漏斗数据
        conversionFunnel: {
          totalProposals: totalProposalsCount,
          approvedProposals: proposalStatusData.find((d: any) => d.name === '已立案')?.value || 0,
          formalProposals: totalFormalCount,
        },

        // 历年数据对比
        yearlyComparison: yearlyComparisonData,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
    }, { status: 500 });
  }
}
