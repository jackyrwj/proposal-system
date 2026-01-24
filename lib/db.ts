// Database connection utility
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'jdhtagz_local',
  timezone: '+08:00', // 设置为中国时区 (UTC+8)
  waitForConnections: true,
  connectionLimit: 100, // 增加连接池大小
  queueLimit: 0,
  enableKeepAlive: true, // 保持连接活跃
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  multipleStatements: true,
  // 强制使用 utf8mb4 编码
  typeCast: function (field: any, next: Function) {
    if (field.type === 'VAR_STRING' || field.type === 'STRING' || field.type === 'BLOB' || field.type === 'TEXT') {
      return field.string();
    }
    return next();
  },
});

// 定期清理空闲连接，防止连接泄漏
setInterval(() => {
  pool.query('SELECT 1').catch(err => {
    console.warn('[DB] Keep-alive query failed:', err.message);
  });
}, 300000); // 每5分钟执行一次

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * 获取中国时区 (UTC+8) 的当前时间字符串
 * 格式: YYYY-MM-DD HH:mm:ss
 */
export function getChinaTimeString(): string {
  const now = new Date();
  // UTC 时间 + 8 小时 = 中国时间
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return chinaTime.toISOString().replace('T', ' ').substring(0, 19);
}

export default pool;
