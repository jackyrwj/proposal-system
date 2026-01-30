import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// 固定加密密钥（32字节，通过 SHA256 哈希确保长度）
const ENCRYPTION_KEY = crypto.createHash('sha256').update('jdhtagz_secure_key_32bytes!!!!').digest();

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的字符串 (格式: iv:encryptedData)
 */
export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // 返回 iv 和加密数据
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * 解密密码
 * @param encryptedText 加密字符串 (格式: iv:encryptedData)
 * @returns 明文密码
 */
export function decryptPassword(encryptedText: string): string {
  const parts = encryptedText.split(':');

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted password format');
  }

  const [ivHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 生成随机密码
 * @param length 密码长度，默认8位
 */
export function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
