// src/lib/db/client.ts
import CloudBase from '@cloudbase/node-sdk';

// 正确的 CloudBase 客户端
class CloudBaseClient {
  app: any;
  db: any;

  constructor() {
    console.log('🔄 初始化 CloudBase 数据库连接...');
    
    try {
      // 使用正确的环境变量名称
      const envId = process.env.CLOUDBASE_ENV_ID;
      const secretId = process.env.CLOUDBASE_SECRET_ID;
      const secretKey = process.env.CLOUDBASE_SECRET_KEY;
      
      console.log('📋 环境变量配置:');
      console.log('  - CLOUDBASE_ENV_ID:', envId ? '已设置' : '未设置');
      console.log('  - CLOUDBASE_SECRET_ID:', secretId ? '已设置' : '未设置');
      console.log('  - CLOUDBASE_SECRET_KEY:', secretKey ? '已设置' : '未设置');
      
      if (!envId || !secretId || !secretKey) {
        throw new Error('CloudBase 环境变量未设置，请检查 .env.local 文件');
      }
      
      this.app = CloudBase.init({
        env: envId,
        secretId: secretId,
        secretKey: secretKey,
      });
      
      this.db = this.app.database();
      console.log('✅ CloudBase 数据库连接初始化成功');
    } catch (error: any) {
      console.error('❌ CloudBase 初始化失败:', error.message);
      throw error;
    }
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 测试数据库连接...');
      const result = await this.db.collection('organizations').limit(1).get();
      console.log('✅ 数据库连接测试成功');
      console.log(`📊 查询到 ${result.data?.length || 0} 条记录`);
      return true;
    } catch (error: any) {
      console.error('❌ 数据库连接测试失败:', error.message);
      return false;
    }
  }
}

// 创建单例实例
let clientInstance: CloudBaseClient | null = null;

export function getDatabaseClient(): CloudBaseClient {
  if (!clientInstance) {
    clientInstance = new CloudBaseClient();
  }
  return clientInstance;
}

// 导出测试函数
export async function testDatabaseConnection() {
  const client = getDatabaseClient();
  return await client.testConnection();
}