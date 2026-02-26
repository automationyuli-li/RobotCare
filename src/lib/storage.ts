// src/lib/storage.ts
import cloudbase from '@cloudbase/node-sdk'; // 或使用 serverless 云函数 SDK
import { v4 as uuidv4 } from 'uuid';

const app = cloudbase.init({
  env: process.env.NEXT_PUBLIC_TCB_ENV_ID!
});

export async function uploadFile(file: Buffer | File, path?: string): Promise<string> {
  const fileName = path || `${uuidv4()}-${Date.now()}`;
  const result = await app.uploadFile({
    cloudPath: `tickets/${fileName}`,
    fileContent: file,
  });
  return result.fileID; // 返回云存储文件ID（可构造URL）
}