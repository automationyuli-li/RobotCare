// src/lib/cloudbase.ts - 腾讯云CloudBase连接
import CloudBase from '@cloudbase/node-sdk';

// 声明 storage 类型
declare module '@cloudbase/node-sdk' {
  interface CloudBase {
    storage(): any;
  }
}

// 初始化 CloudBase 应用
const initCloudBase = () => {
  const envId = process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.CLOUDBASE_SECRET_KEY;

  if (!envId || !secretId || !secretKey) {
    console.error('❌ CloudBase 环境变量未配置');
    throw new Error('CloudBase environment variables are not configured');
  }

  try {
    const app = CloudBase.init({
      env: envId,
      secretId,
      secretKey,
    });

    console.log('✅ CloudBase 初始化成功');
    return app;
  } catch (error) {
    console.error('❌ CloudBase 初始化失败:', error);
    throw error;
  }
};

// 导出单例实例
export const cloudbaseApp = initCloudBase();
export const db = cloudbaseApp.database();
export const storage = (cloudbaseApp as any).storage();