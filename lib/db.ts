// Database connection utility
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'jdhtagz_local',
  timezone: '+08:00',
  waitForConnections: true,
  connectionLimit: 5, // 进一步减小连接池大小
  queueLimit: 100, // 限制等待队列
  connectTimeout: 8000, // 连接超时 8 秒
  enableKeepAlive: true,
  keepAliveInitialDelay: 20000, // 每 20 秒发送心跳
  idleTimeout: 8000, // 空闲连接 8 秒后关闭
  charset: 'utf8mb4',
  multipleStatements: true,
});

export async function query<T = any>(sql: string, params?: any[], retryCount = 2): Promise<T[]> {
  for (let i = 0; i <= retryCount; i++) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows as T[];
    } catch (error: any) {
      // 如果是连接问题且还有重试次数，等待后重试
      if (error.code === 'ER_CON_COUNT_ERROR' && i < retryCount) {
        console.warn(`[DB] Connection error, retry ${i + 1}/${retryCount}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      console.error('[DB] Query error:', error.message);
      throw error;
    }
  }
  throw new Error('Query failed after retries');
}

/**
 * 获取中国时区 (UTC+8) 的当前时间字符串
 * 格式: YYYY-MM-DD HH:mm:ss
 */
export function getChinaTimeString(): string {
  const now = new Date();
  // 直接构造北京时间字符串，不依赖任何时区转换
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours() + 8).padStart(2, '0');
  const minute = String(now.getUTCMinutes()).padStart(2, '0');
  const second = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export default pool;
