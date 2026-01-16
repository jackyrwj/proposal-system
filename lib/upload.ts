import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * 上传文件到 public/uploads 目录
 * @param file File对象
 * @returns 文件URL路径 (如 /uploads/xxx.pdf)
 */
export async function uploadFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 生成唯一文件名
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(file.name);
  const filename = `${timestamp}-${random}${ext}`;

  // 上传目录
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  // 确保目录存在
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

/**
 * 验证文件类型是否合法
 * @param filename 文件名
 * @param allowedExtensions 允许的扩展名列表 (如 ['.pdf', '.doc'])
 */
export function validateFileType(filename: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * 验证文件大小是否合法
 * @param file File对象
 * @param maxSizeMB 最大文件大小（MB）
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}
