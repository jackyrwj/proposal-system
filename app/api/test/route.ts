import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = {
      host: process.env.DB_HOST || 'not set',
      port: process.env.DB_PORT || 'not set',
      user: process.env.DB_USER || 'not set',
      password: process.env.DB_PASSWORD ? '***' : 'not set',
      database: process.env.DB_NAME || 'not set',
    };

    return NextResponse.json({
      success: true,
      env: config,
      message: 'Environment variables loaded successfully',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
