// src/lib/db/tencent-helper.ts
/**
 * 腾讯云文档型数据库辅助函数
 * 用于解决 CloudBase 的特殊性问题
 */

// 生成腾讯云兼容的 ID
export function generateTencentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// 处理腾讯云的查询结果
export function processTencentResult(result: any): any {
  if (!result) return null;
  
  // 如果结果是数组，处理每个元素
  if (Array.isArray(result.data)) {
    return result.data.map((item: any) => ({
      ...item,
      _id: item._id || item.id, // 统一使用 _id
    }));
  }
  
  // 如果是单个对象
  if (result.data && typeof result.data === 'object') {
    return {
      ...result.data,
      _id: result.data._id || result.data.id,
    };
  }
  
  return result;
}

// 创建腾讯云兼容的文档数据
export function createTencentDocument(data: any, withTimestamps = true) {
  const document = { ...data };
  
  if (withTimestamps) {
    const now = new Date();
    document.created_at = document.created_at || now;
    document.updated_at = now;
  }
  
  // 确保有 _id
  if (!document._id && !document.id) {
    document._id = generateTencentId();
  }
  
  return document;
}

// 验证腾讯云查询参数
export function validateTencentQuery(query: any): any {
  const validQuery = { ...query };
  
  // 处理特殊查询条件
  Object.keys(validQuery).forEach(key => {
    // 如果是对象，可能是比较操作符
    if (typeof validQuery[key] === 'object') {
      // 处理 $eq, $ne, $gt, $lt 等操作符
      const operators = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin'];
      for (const op of operators) {
        if (validQuery[key][op] !== undefined) {
          // 腾讯云使用不同的操作符格式，这里需要转换
          // 暂时保持原样，需要时再实现转换逻辑
        }
      }
    }
  });
  
  return validQuery;
}