import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing lib/db query...');

    const proposals = await query(`
      SELECT tajyId, tajybh, title
      FROM tajy
      ORDER BY tajyId DESC
      LIMIT 1
    `);

    console.log('Query result:', proposals);

    return NextResponse.json({
      success: true,
      data: proposals,
      count: proposals.length,
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
