import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取系统统计信息
export async function GET() {
  try {
    // 并行查询各表的记录数
    const [
      proposalsResult,
      formalProposalsResult,
      usersResult,
      signaturesResult,
      departmentsResult,
    ] = await Promise.all([
      query<any[]>(`SELECT COUNT(*) as count FROM tajy`),
      query<any[]>(`SELECT COUNT(*) as count FROM zsta`),
      query<any[]>(`SELECT COUNT(*) as count FROM jdhmd`),
      query<any[]>(`SELECT COUNT(*) as count FROM signature`),
      query<any[]>(`SELECT COUNT(*) as count FROM department`),
    ]);

    const proposalsCount = (proposalsResult as any[])[0]?.count || 0;
    const formalProposalsCount = (formalProposalsResult as any[])[0]?.count || 0;
    const usersCount = (usersResult as any[])[0]?.count || 0;
    const signaturesCount = (signaturesResult as any[])[0]?.count || 0;
    const departmentsCount = (departmentsResult as any[])[0]?.count || 0;

    const stats = {
      proposals: proposalsCount,
      formalProposals: formalProposalsCount,
      users: usersCount,
      signatures: signaturesCount,
      departments: departmentsCount,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
