import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpass',
      database: process.env.DB_NAME || 'jdhtagz_local',
    };

    // Test direct connection
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM tajy');
    const count = (rows as any)[0].count;

    await connection.end();

    return NextResponse.json({
      success: true,
      data: {
        connection: 'success',
        tajyCount: count,
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
        },
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
      },
    }, { status: 500 });
  }
}
