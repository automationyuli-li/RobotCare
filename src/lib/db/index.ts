// src/lib/db/index.ts - 数据库抽象层
export interface DatabaseAdapter {
  // 认证相关
  auth: {
    login: (email: string, password: string) => Promise<any>;
    register: (data: any) => Promise<any>;
    logout: () => Promise<void>;
  };

  // 集合操作
  collection: (name: string) => {
    find: (query?: any, options?: FindOptions) => Promise<any[]>;
    findOne: (query: any) => Promise<any>;
    insert: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    count: (query?: any) => Promise<number>;
  };

  // 文件存储
  storage: {
    upload: (path: string, file: any) => Promise<string>;
    getUrl: (path: string) => string;
    delete: (path: string) => Promise<void>;
  };
}

// 定义查询选项类型
interface FindOptions {
  limit?: number;
  skip?: number;
  orderBy?: {
    field: string;
    direction?: 'asc' | 'desc';
  };
  sort?: {
    [key: string]: 1 | -1;
  };
}

// 腾讯云适配器
class TencentAdapter implements DatabaseAdapter {
  private db: any;
  private cloudStorage: any;

  constructor(db: any, storage: any) {
    this.db = db;
    this.cloudStorage = storage;
  }

  auth = {
    login: async (email: string, password: string) => {
      // 实现登录逻辑
      const users = await this.db.collection('users')
        .where({ email })
        .get();
      
      return { user: users.data[0] };
    },

    register: async (data: any) => {
      // 实现注册逻辑
      const result = await this.db.collection('users').add(data);
      return { id: result.id, ...data };
    },

    logout: async () => {
      // 实现登出逻辑
      // 腾讯云可能需要清除 session
    }
  };

  collection = (name: string) => ({
    find: async (query = {}, options: FindOptions = {}) => {
      let collectionRef = this.db.collection(name).where(query);
      
      if (options.limit) {
        collectionRef = collectionRef.limit(options.limit);
      }
      
      if (options.skip) {
        collectionRef = collectionRef.skip(options.skip);
      }

      if (options.orderBy) {
        collectionRef = collectionRef.orderBy(
          options.orderBy.field,
          options.orderBy.direction || 'asc'
        );
      }
      
      const result = await collectionRef.get();
      return result.data;
    },

    findOne: async (query: any) => {
      const result = await this.db.collection(name)
        .where(query)
        .limit(1)
        .get();
      
      return result.data[0] || null;
    },

    insert: async (data: any) => {
      const result = await this.db.collection(name).add({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      });
      
      return { _id: result.id, ...data };
    },

    update: async (id: string, data: any) => {
      await this.db.collection(name).doc(id).update({
        ...data,
        updated_at: new Date(),
      });
      
      return { _id: id, ...data };
    },

    delete: async (id: string) => {
      await this.db.collection(name).doc(id).remove();
      return true;
    },

    count: async (query?: any) => {
      const result = await this.db.collection(name)
        .where(query || {})
        .count();
      
      return result.total;
    }
  });

  storage = {
    upload: async (path: string, file: any) => {
      const result = await this.cloudStorage.uploadFile({
        cloudPath: path,
        filePath: file.path,
      });
      
      return result.fileID;
    },

    getUrl: (fileID: string) => {
      // 返回文件访问URL
      return `https://${process.env.CLOUDBASE_ENV_ID}.tcb.qcloud.la/${fileID}`;
    },

    delete: async (fileID: string) => {
      await this.cloudStorage.deleteFile({
        fileList: [fileID]
      });
    }
  };
}

// 创建数据库实例
import { db, storage } from '@/lib/cloudbase';

const databaseAdapter: DatabaseAdapter = new TencentAdapter(db, storage);

export default databaseAdapter;