import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    console.log('Debug - Parameters:', { limit, page, offset });

    // Test basic query
    console.log('Debug - Testing basic query...');
    const proposals = await query(`
      SELECT
        tajyId, tajybh, title, depart, name
      FROM tajy
      ORDER BY tajyId DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    console.log('Debug - Proposals query result:', proposals.length, 'items');

    // Test count query
    console.log('Debug - Testing count query...');
    const [countResult] = await query<{ total: number }>(`
      SELECT COUNT(*) as total FROM tajy
    `);

    console.log('Debug - Count result:', countResult);

    return NextResponse.json({
      success: true,
      debug: {
        params: { limit, page, offset },
        proposalsCount: proposals.length,
        totalCount: countResult?.total || 0,
      },
      data: proposals,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Debug - Error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
