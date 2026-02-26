require('dotenv').config({ path: '.env.local' });
const CloudBase = require('@cloudbase/node-sdk');

// 核心集合定义
const CORE_COLLECTIONS = [
  { name: 'comments', desc: '评论表' },
  { name: 'organizations', desc: '组织表' },
  { name: 'users', desc: '用户表' },
  { name: 'robots', desc: '机器人表' },
  { name: 'tickets', desc: '工单表' },
  { name: 'timeline_events', desc: '时间线事件表' },
  { name: 'service_contracts', desc: '服务合约表' },
  { name: 'invitations', desc: '邀请记录表' },
  { name: 'subscriptions', desc: '订阅记录表' },
  { name: 'subscriptions_plans', desc: '订阅方案表' },
  { name: 'library', desc: '知识库表' },
  { name: 'library_attachments', desc: '知识库附件表' },
  { name: 'library_categories', desc: '知识库分类列表' },
  { name: 'maintenance_log', desc: '维修记录表' },
  { name: 'sessions', desc: 'session表' },
];

async function initCollections() {
  console.log('🔄 开始初始化数据库集合...\n');
  
  const app = CloudBase.init({
    env: process.env.CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });
  
  const db = app.database();
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  // 逐一创建集合
  for (const collection of CORE_COLLECTIONS) {
    console.log(`📁 处理: ${collection.name} (${collection.desc})`);
    
    try {
      // 先尝试查询，检查集合是否存在
      const testResult = await db.collection(collection.name).limit(1).get();
      
      if (testResult.data.length >= 0) {
        console.log(`   ⏭️  集合已存在，跳过`);
        skipped++;
        continue;
      }
    } catch (queryError) {
      // 查询失败通常表示集合不存在，可以继续创建
    }
    
    try {
      // 尝试创建文档来隐式创建集合
      const createResult = await db.collection(collection.name).add({
        _init: true,
        created_at: new Date(),
        note: '集合初始化文档'
      });
      
      console.log(`   ✅ 创建成功 (文档ID: ${createResult.id})`);
      created++;
      
      // 清理初始化文档
      try {
        await db.collection(collection.name).doc(createResult.id).remove();
        console.log(`   🧹 清理初始化文档`);
      } catch (cleanError) {
        // 清理失败也没关系
      }
      
    } catch (createError) {
      console.log(`   ❌ 创建失败: ${createError.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  // 统计结果
  console.log('📊 初始化结果统计:');
  console.log(`   ✅ 创建成功: ${created} 个集合`);
  console.log(`   ⏭️  跳过已存在: ${skipped} 个集合`);
  console.log(`   ❌ 创建失败: ${failed} 个集合`);
  
  if (failed === 0) {
    console.log('\n🎉 数据库集合初始化完成！');
    console.log('\n💡 下一步：启动开发服务器并创建用户界面');
    console.log('   npm run dev');
  } else {
    console.log('\n⚠️  部分集合创建失败，请检查权限配置');
  }
}

// 执行初始化
initCollections().catch(error => {
  console.error('❌ 初始化过程出错:', error);
  process.exit(1);
});
