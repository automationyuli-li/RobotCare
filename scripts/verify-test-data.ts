// scripts/verify-test-data.ts
import dotenv from 'dotenv';
import CloudBase from '@cloudbase/node-sdk';

dotenv.config({ path: '.env.local' });

const app = CloudBase.init({
  env: process.env.CLOUDBASE_ENV_ID,
  secretId: process.env.CLOUDBASE_SECRET_ID,
  secretKey: process.env.CLOUDBASE_SECRET_KEY,
});

const db = app.database();

async function verifyTestData() {
  console.log('🔍 验证测试数据...');

  try {
    // 1. 验证终端客户组织
    console.log('\n1. 验证终端客户组织:');
    const customerOrg = await db
      .collection('organizations')
      .where({
        contact_email: 'customer@test.com',
        type: 'end_customer'
      })
      .get();

    if (customerOrg.data.length > 0) {
      console.log('✅ 终端客户组织已创建:');
      console.log(`   名称: ${customerOrg.data[0].name}`);
      console.log(`   状态: ${customerOrg.data[0].status}`);
    } else {
      console.log('❌ 终端客户组织未找到');
    }

    // 2. 验证终端客户管理员
    console.log('\n2. 验证终端客户管理员:');
    const customerAdmin = await db
      .collection('users')
      .where({
        email: 'customer_admin@test.com',
        role: 'end_admin'
      })
      .get();

    if (customerAdmin.data.length > 0) {
      console.log('✅ 终端客户管理员已创建:');
      console.log(`   姓名: ${customerAdmin.data[0].display_name}`);
      console.log(`   状态: ${customerAdmin.data[0].status}`);
    } else {
      console.log('❌ 终端客户管理员未找到');
    }

    // 3. 验证服务合约
    console.log('\n3. 验证服务合约:');
    const contracts = await db
      .collection('service_contracts')
      .where({
        status: 'active'
      })
      .get();

    console.log(`✅ 活跃服务合约数量: ${contracts.data.length}`);
    contracts.data.forEach((contract: any, index: number) => {
      console.log(`   合约 ${index + 1}: ${contract.contract_number}`);
    });

    // 4. 验证测试机器人
    console.log('\n4. 验证测试机器人:');
    const robots = await db
      .collection('robots')
      .where({
        brand: 'Universal Robots'
      })
      .get();

    console.log(`✅ 机器人数量: ${robots.data.length}`);
    robots.data.forEach((robot: any, index: number) => {
      console.log(`   机器人 ${index + 1}: ${robot.sn} - ${robot.status}`);
    });

    // 5. 验证时间线事件
    console.log('\n5. 验证时间线事件:');
    const timelineEvents = await db
      .collection('timeline_events')
      .get();

    console.log(`✅ 时间线事件数量: ${timelineEvents.data.length}`);

    // 6. 验证工单
    console.log('\n6. 验证工单:');
    const tickets = await db
      .collection('tickets')
      .get();

    console.log(`✅ 工单数量: ${tickets.data.length}`);

    console.log('\n🎉 数据验证完成！');

  } catch (error: any) {
    console.error('❌ 验证失败:', error.message);
  }
}

verifyTestData();