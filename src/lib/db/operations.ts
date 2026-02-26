// src/lib/db/operations.ts 
import { de } from 'date-fns/locale';
import { getDatabaseClient } from './client';

// 简单的 db 操作对象
export const db = {
  // 查找单条记录
  async findOne(collection: string, query: any): Promise<any> {
    try {
      const client = getDatabaseClient();
      const result = await client.db.collection(collection)
        .where(query)
        .limit(1)
        .get();
      return result.data?.[0] || null;
    } catch (error) {
      console.error(`❌ findOne 失败 [${collection}]:`, error);
      throw error;
    }
  },
  // 按条件删除的专用方法（可选，为了更清晰的语义）
async deleteMany(collection: string, query: any): Promise<any> {
  try {
    const client = getDatabaseClient();
    // 先获取要删除的记录
    const result = await client.db.collection(collection).where(query).get();
    const ids = result.data?.map((doc: any) => doc._id) || [];
    
    if (ids.length === 0) {
      return { deletedCount: 0 };
    }
    
    // 批量删除
    const deletePromises = ids.map((id: string) => 
      client.db.collection(collection).doc(id).remove()
    );
    await Promise.all(deletePromises);
    
    return { deletedCount: ids.length, deletedIds: ids };
  } catch (error) {
    console.error(`❌ deleteMany 失败 [${collection}]:`, error);
    throw error;
  }
},

  // 查找多条记录
  async find(collection: string, query: any, options?: any): Promise<any[]> {
    try {
      const client = getDatabaseClient();
      let queryBuilder = client.db.collection(collection).where(query);
      
      if (options?.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }
      
      // CloudBase 的排序
      if (options?.sort) {
        const { field, direction = 'asc' } = options.sort;
        queryBuilder = queryBuilder.orderBy(field, direction);
      }
      
      const result = await queryBuilder.get();
      return result.data || [];
    } catch (error) {
      console.error(`❌ find 失败 [${collection}]:`, error);
      throw error;
    }
  },

  // 插入记录
  async insert(collection: string, data: any): Promise<any> {
    try {
      const client = getDatabaseClient();
      const timestamp = new Date();
      
      const dataWithTimestamps = {
        ...data,
        created_at: timestamp,
        updated_at: timestamp,
      };
      
      const result = await client.db.collection(collection).add(dataWithTimestamps);
      
      // CloudBase 返回 { id: 'xxx' }
      return { 
        ...dataWithTimestamps, 
        _id: result.id 
      };
    } catch (error) {
      console.error(`❌ insert 失败 [${collection}]:`, error);
      throw error;
    }
  },

  // 更新记录
  async update(collection: string, id: string, data: any): Promise<any> {
    try {
      const client = getDatabaseClient();
      
      const updateData = {
        ...data,
        updated_at: new Date(),
      };
      
      await client.db.collection(collection).doc(id).update(updateData);
      
      return { ...updateData, _id: id };
    } catch (error) {
      console.error(`❌ update 失败 [${collection}]:`, error);
      throw error;
    }
  },

  // 删除记录
  async delete(collection: string, idOrQuery: string | any): Promise<any> {
    try {
      const client = getDatabaseClient();

      if (typeof idOrQuery === 'string') {
        // 按 ID 删除
      await client.db.collection(collection).doc(idOrQuery).remove();
      return { _id: idOrQuery, deleted: true };
    } else {
        // 按查询条件删除
        const query = idOrQuery;
        const result = await client.db.collection(collection).where(query).get();
        const ids = result.data?.map((doc: any) => doc._id) || [];
        if (ids.length === 0) {
          return { deletedCount: 0 };
        }
        // 批量删除
        const deletePromises = ids.map((id: string) => 
          client.db.collection(collection).doc(id).remove()
        );
        await Promise.all(deletePromises);
        return { deletedCount: ids.length, deletedIds: ids };
      }
    }catch (error) {
      console.error(`❌ delete 失败 [${collection}]:`, error);
      throw error;
    }
  },

  // 统计记录
  async count(collection: string, query: any): Promise<number> {
    try {
      const client = getDatabaseClient();
      const result = await client.db.collection(collection).where(query).count();
      return result.total || 0;
    } catch (error) {
      console.error(`❌ count 失败 [${collection}]:`, error);
      throw error;
    }
  }
};