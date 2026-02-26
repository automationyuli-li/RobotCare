// scripts/debug-registration.js
import dotenv from 'dotenv';
import CloudBase from '@cloudbase/node-sdk';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const app = CloudBase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.CLOUDBASE_SECRET_ID,
  secretKey: process.env.CLOUDBASE_SECRET_KEY,
});

const db = app.database();

async function testRegistration() {
  console.log('🔍 开始测试注册流程...\n');

  const testData = {
    organizationName: '测试公司',
    contactEmail: `test${Date.now()}@example.com`,
    contactPhone: '13800138000',
    adminEmail: `admin${Date.now()}@example.com`,
    adminPassword: 'Test123456',
    adminDisplayName: '测试管理员',
    subscriptionPlan: 'free'
  };

  console.log('📝 测试数据:', testData);

  try {
    // 1. 检查邮箱是否已注册
    console.log('\n1. 检查邮箱重复...');
    const existingUser = await db.collection('users')
      .where({ email: testData.adminEmail })
      .get();
    
    if (existingUser.data.length > 0) {
      console.log('❌ 邮箱已存在');
    } else {
      console.log('✅ 邮箱可用');
    }

    // 2. 检查组织邮箱是否重复
    const existingOrg = await db.collection('organizations')
      .where({ contact_email: testData.contactEmail })
      .get();
    
    if (existingOrg.data.length > 0) {
      console.log('❌ 组织邮箱已存在');
    } else {
      console.log('✅ 组织邮箱可用');
    }

    // 3. 测试密码哈希
    console.log('\n2. 测试密码哈希...');
    const passwordHash = await bcrypt.hash(testData.adminPassword, 12);
    console.log('✅ 密码哈希成功:', passwordHash.substring(0, 20) + '...');

    // 4. 套餐配置
    const SUBSCRIPTION_PLANS = {
      free: { max_robots: 5, max_customers: 1, max_engineers: 2 },
      silver: { max_robots: 100, max_customers: 5, max_engineers: 10 },
      gold: { max_robots: 1000, max_customers: 50, max_engineers: 20 },
      premium: { max_robots: 5000, max_customers: 200, max_engineers: 9999 },
    };

    const planConfig = SUBSCRIPTION_PLANS[testData.subscriptionPlan] || SUBSCRIPTION_PLANS.free;

    // 5. 创建组织数据
    const orgData = {
      _id: uuidv4(),
      name: testData.organizationName,
      type: 'service_provider',
      contact_email: testData.contactEmail,
      contact_phone: testData.contactPhone,
      subscription_plan: testData.subscriptionPlan,
      ...planConfig,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log('\n3. 尝试创建组织...');
    console.log('组织数据:', JSON.stringify(orgData, null, 2));
    
    const orgResult = await db.collection('organizations').add(orgData);
    console.log('✅ 组织创建成功, ID:', orgResult.id);
    orgData._id = orgResult.id;

    // 6. 创建用户数据
    const userData = {
      _id: uuidv4(),
      email: testData.adminEmail,
      password_hash: passwordHash,
      display_name: testData.adminDisplayName,
      role: 'service_admin',
      org_id: orgData._id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        avatar_color: 'bg-blue-500 text-white',
        is_org_admin: true,
      },
    };

    console.log('\n4. 尝试创建用户...');
    const userResult = await db.collection('users').add(userData);
    console.log('✅ 用户创建成功, ID:', userResult.id);
    userData._id = userResult.id;

    // 7. 创建订阅记录
    const subscriptionData = {
      _id: uuidv4(),
      org_id: orgData._id,
      plan: testData.subscriptionPlan,
      start_date: new Date(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'active',
      payment_status: testData.subscriptionPlan === 'free' ? 'free' : 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log('\n5. 尝试创建订阅...');
    const subscriptionResult = await db.collection('subscriptions').add(subscriptionData);
    console.log('✅ 订阅创建成功, ID:', subscriptionResult.id);

    console.log('\n🎉 所有测试通过！');
    
    // 验证数据已写入
    console.log('\n🔍 验证写入的数据...');
    
    const verifyOrg = await db.collection('organizations').doc(orgData._id).get();
    console.log('组织数据验证:', verifyOrg.data ? '✅' : '❌');
    
    const verifyUser = await db.collection('users').doc(userData._id).get();
    console.log('用户数据验证:', verifyUser.data ? '✅' : '❌');
    
    const verifySub = await db.collection('subscriptions').doc(subscriptionResult.id).get();
    console.log('订阅数据验证:', verifySub.data ? '✅' : '❌');

    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await db.collection('organizations').doc(orgData._id).remove();
    await db.collection('users').doc(userData._id).remove();
    await db.collection('subscriptions').doc(subscriptionResult.id).remove();
    console.log('✅ 测试数据已清理');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testRegistration();