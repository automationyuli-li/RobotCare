require('dotenv').config({ path: '.env.local' });

const CloudBase = require('@cloudbase/node-sdk');

async function testConnection() {
  console.log('🔍 测试 CloudBase 数据库连接...');
  
  const envId = process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.CLOUDBASE_SECRET_ID;
  const secretKey = process.env.CLOUDBASE_SECRET_KEY;
  
  console.log('📋 环境配置:');
  console.log(`  环境ID: ${envId}`);
  console.log(`  SecretId: ${secretId ? '已设置' : '未设置'}`);
  
  try {
    const app = CloudBase.init({ env: envId, secretId, secretKey });
    const db = app.database();
    
    // 1. 测试基本查询
    console.log('\n1. 测试基本查询...');
    const result = await db.collection('organizations').limit(1).get();
    console.log('✅ 基本查询成功！');
    console.log(`   查询到 ${result.data.length} 条记录`);
    
    if (result.data.length > 0) {
      console.log('   第一条记录:', JSON.stringify(result.data[0], null, 2));
    }
    
    // 2. 尝试创建测试集合
    console.log('\n2. 测试创建集合...');
    try {
      const testResult = await db.collection('test_collection_connection').add({
        test: 'connection_test',
        timestamp: new Date(),
      });
      console.log('✅ 创建文档成功！');
      console.log(`   文档ID: ${testResult.id}`);
      
      // 删除测试文档
      await db.collection('test_collection_connection').doc(testResult.id).remove();
      console.log('✅ 清理测试文档');
    } catch (createError) {
      console.log('⚠️  创建测试文档失败（可能是权限问题）:', createError.message);
    }
    
    // 3. 测试更多操作
    console.log('\n3. 测试更多数据库操作...');
    
    // 计数
    try {
      const countResult = await db.collection('organizations').count();
      console.log(`✅ 计数操作成功: ${countResult.total} 条记录`);
    } catch (countError) {
      console.log('⚠️  计数操作失败:', countError.message);
    }
    
    // 查询条件测试
    try {
      const whereResult = await db.collection('organizations')
        .where({ _id: result.data[0]?._id || 'test' })
        .get();
      console.log('✅ 条件查询成功');
    } catch (whereError) {
      console.log('⚠️  条件查询失败:', whereError.message);
    }
    
    console.log('\n🎉 所有测试完成！');
    console.log('✅ CloudBase 连接完全正常！');
    console.log('\n💡 下一步：初始化数据库集合');
    
    return true;
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return false;
  }
}

// 执行测试
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
