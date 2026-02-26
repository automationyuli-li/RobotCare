// src/lib/db/connection-pool.ts
import CloudBase from '@cloudbase/node-sdk';

// 单例连接池管理
class ConnectionPool {
  private static instance: ConnectionPool;
  private app: any;
  private db: any;
  private connections: any[] = [];
  private maxConnections: number = 5;

  private constructor() {
    // 私有构造函数，防止外部实例化
    this.initialize();
  }

  public static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  // 初始化 CloudBase 应用和数据库连接
  private initialize(): void {
    try {
      console.log('🔄 初始化腾讯云 CloudBase 数据库连接...');
      
      // 从环境变量读取配置
      const envId = process.env.CLOUDBASE_ENV_ID;
      const secretId = process.env.CLOUDBASE_SECRET_ID;
      const secretKey = process.env.CLOUDBASE_SECRET_KEY;

      if (!envId || !secretId || !secretKey) {
        throw new Error('❌ CloudBase 环境变量未正确配置，请检查 .env.local 文件');
      }

      // 初始化 CloudBase 应用
      this.app = CloudBase.init({
        env: envId,
        secretId: secretId,
        secretKey: secretKey,
      });

      // 获取数据库实例 - 文档型数据库使用 database() 方法
      this.db = this.app.database();
      
      console.log('✅ CloudBase 数据库连接初始化成功');
      
      // 预创建连接
      this.createConnections();
      
    } catch (error: any) {
      console.error('❌ CloudBase 初始化失败:', error.message);
      throw error;
    }
  }

  // 创建数据库连接
  private createConnections(): void {
    for (let i = 0; i < this.maxConnections; i++) {
      try {
        // 对于文档型数据库，我们直接使用 db 实例
        // 每个"连接"实际上是一个可用的数据库引用
        const connection = {
          id: i + 1,
          db: this.db,
          available: true,
          lastUsed: new Date(),
        };
        
        this.connections.push(connection);
        console.log(`✅ 连接 ${connection.id} 创建成功`);
      } catch (error: any) {
        console.error(`❌ 连接 ${i + 1} 创建失败:`, error.message);
        // 继续创建其他连接
      }
    }
  }

  // 获取一个可用的数据库连接
  public async getConnection(): Promise<any> {
    // 寻找可用的连接
    const availableConnection = this.connections.find(conn => conn.available);
    
    if (availableConnection) {
      availableConnection.available = false;
      availableConnection.lastUsed = new Date();
      console.log(`🔗 使用连接 ${availableConnection.id}`);
      return availableConnection.db;
    }
    
    // 如果没有可用连接，等待并重试
    console.log('⏳ 连接池繁忙，等待可用连接...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getConnection();
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      // 尝试执行一个简单操作：获取所有集合名称（或使用其他轻量级查询）
      // CloudBase 文档型数据库可以通过 collection.get() 但可能耗时，建议使用 serverDate 或其他方式
      // 这里以获取集合列表为例（需要 db 实例支持）
      const collections = await this.db.listCollections(); // 具体方法依 SDK 版本而定
      // 如果 SDK 没有 listCollections，可以尝试执行一个简单的 count 查询，如：
      // await this.db.collection('any_collection').count();
      
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  }

  // 释放连接
  public releaseConnection(db: any): void {
    const connection = this.connections.find(conn => conn.db === db);
    if (connection) {
      connection.available = true;
      console.log(`🔄 连接 ${connection.id} 已释放`);
    }
  }

  // 获取当前连接状态
  public getStatus(): any {
    return {
      total: this.connections.length,
      available: this.connections.filter(conn => conn.available).length,
      inUse: this.connections.filter(conn => !conn.available).length,
      connections: this.connections.map(conn => ({
        id: conn.id,
        available: conn.available,
        lastUsed: conn.lastUsed,
      })),
    };
  }
}

export default ConnectionPool;