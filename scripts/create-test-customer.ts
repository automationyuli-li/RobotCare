// scripts/create-test-customer.ts
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

async function createTestCustomer() {
  console.log('🔧 开始创建测试终端客户...');

  try {
    // 1. 首先查找现有的服务商管理员账户
    console.log('1. 查找服务商管理员账户...');
    const serviceProviderResult = await db
      .collection('users')
      .where({
        email: 'admin@test.com',
        role: 'service_admin'
      })
      .get();

    if (serviceProviderResult.data.length === 0) {
      console.error('❌ 找不到服务商管理员账户: admin@test.com');
      console.log('请先确保服务商管理员账户已存在');
      return;
    }

    const serviceProviderAdmin = serviceProviderResult.data[0];
    const serviceProviderOrgId = serviceProviderAdmin.org_id;

    console.log(`✅ 找到服务商管理员: ${serviceProviderAdmin.display_name}`);
    console.log(`服务商组织ID: ${serviceProviderOrgId}`);

    // 获取服务商组织信息
    const serviceProviderOrgResult = await db
      .collection('organizations')
      .doc(serviceProviderOrgId)
      .get();

    if (!serviceProviderOrgResult.data) {
      console.error('❌ 找不到服务商组织信息');
      return;
    }

    const serviceProviderOrg = serviceProviderOrgResult.data as any; // 类型断言
    if (serviceProviderOrg) {
    console.log(`服务商组织: ${serviceProviderOrg.name}`);
    } else {
    console.error('❌ 找不到服务商组织信息');
    return;
    }

    // 2. 创建终端客户组织
    console.log('2. 创建终端客户组织...');
    const customerOrgId = uuidv4();
    const customerOrgData = {
      _id: customerOrgId,
      name: '测试制造有限公司',
      type: 'end_customer',
      contact_email: 'customer@test.com',
      contact_phone: '13800138000',
      subscription_plan: 'free',
      max_robots: 5,
      max_customers: 0,
      max_engineers: 2,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        address: '上海市浦东新区',
        industry: '汽车制造',
        invited_by: serviceProviderOrgId,
      },
    };

    await db.collection('organizations').add(customerOrgData);
    console.log(`✅ 创建终端客户组织: ${customerOrgData.name}`);

    // 3. 创建终端客户管理员用户
    console.log('3. 创建终端客户管理员用户...');
    const customerUserId = uuidv4();
    const passwordHash = await bcrypt.hash('customer123', 12);
    const customerUserData = {
      _id: customerUserId,
      email: 'customer_admin@test.com',
      password_hash: passwordHash,
      display_name: '终端客户管理员',
      role: 'end_admin',
      org_id: customerOrgId,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: null,
      login_count: 0,
      metadata: {
        avatar_color: 'bg-green-500 text-white',
        is_org_admin: true,
      },
    };

    await db.collection('users').add(customerUserData);
    console.log(`✅ 创建终端客户管理员: ${customerUserData.display_name}`);
    console.log(`登录邮箱: ${customerUserData.email}`);
    console.log(`登录密码: customer123`);

    // 4. 创建服务合约
    console.log('4. 创建服务合约...');
    const contractId = uuidv4();
    const contractData = {
      _id: contractId,
      service_provider_id: serviceProviderOrgId,
      end_customer_id: customerOrgId,
      contract_number: `CONTRACT-${Date.now()}`,
      start_date: new Date(),
      end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 一年后到期
      status: 'active',
      terms_accepted: true,
      nda_accepted: true,
      created_by: serviceProviderAdmin._id,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        service_level: 'standard',
        billing_cycle: 'yearly',
        payment_terms: '预付',
        special_terms: '技术支持7x24小时响应',
      },
    };

    await db.collection('service_contracts').add(contractData);
    console.log(`✅ 创建服务合约: ${contractData.contract_number}`);

    // 5. 创建终端客户工程师（可选）
    console.log('5. 创建终端客户工程师...');
    const engineerUserId = uuidv4();
    const engineerPasswordHash = await bcrypt.hash('engineer123', 12);
    const engineerUserData = {
      _id: engineerUserId,
      email: 'customer_engineer@test.com',
      password_hash: engineerPasswordHash,
      display_name: '王工程师',
      role: 'end_engineer',
      org_id: customerOrgId,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: null,
      login_count: 0,
      metadata: {
        avatar_color: 'bg-blue-500 text-white',
        department: '设备维护部',
      },
    };

    await db.collection('users').add(engineerUserData);
    console.log(`✅ 创建终端客户工程师: ${engineerUserData.display_name}`);
    console.log(`登录邮箱: ${engineerUserData.email}`);
    console.log(`登录密码: engineer123`);

    // 6. 创建测试机器人
    console.log('6. 创建测试机器人...');
    const robotId = uuidv4();
    const robotData = {
      _id: robotId,
      sn: `ROBOT-${Date.now().toString().slice(-6)}`,
      brand: 'Universal Robots',
      model: 'UR10e',
      org_id: customerOrgId,
      service_provider_id: serviceProviderOrgId,
      location: '装配线 #3',
      status: 'active',
      specs: {
        manufacture_date: new Date('2023-03-15'),
        warranty_end: new Date('2025-03-15'),
        last_maintenance_date: new Date('2023-12-01'),
        next_maintenance_date: new Date('2024-03-01'),
        operating_hours: 1250,
      },
      metadata: {
        production_line: '汽车装配线',
        process_station: '焊接工位',
        notes: '测试机器人，用于演示目的',
        specifications: [
          { key: '工作范围', value: '1300 mm' },
          { key: '负载能力', value: '10 kg' },
          { key: '重复精度', value: '±0.1 mm' },
        ],
        peripherals: [
          { 
            name: '3D视觉系统', 
            type: 'vision', 
            connected: true,
            description: '用于零件识别和定位'
          },
          { 
            name: '力控传感器', 
            type: 'sensor', 
            connected: true,
            description: '用于力控打磨'
          },
        ],
      },
      created_by: customerUserId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection('robots').add(robotData);
    console.log(`✅ 创建测试机器人: ${robotData.sn}`);
    console.log(`品牌型号: ${robotData.brand} ${robotData.model}`);

    // 7. 创建时间线事件
    console.log('7. 创建时间线事件...');
    const timelineEventId = uuidv4();
    const timelineEventData = {
      _id: timelineEventId,
      robot_id: robotId,
      event_type: 'ticket',
      title: '机器人初始化测试',
      description: '完成机器人安装和初始化测试，所有功能正常运行',
      created_by: customerUserId,
      created_at: new Date(),
      metadata: {
        ticket_id: `TICKET-${Date.now().toString().slice(-6)}`,
        priority: 'medium',
        status: 'resolved',
        attachments: ['测试报告.pdf'],
        tags: ['安装', '测试'],
      },
    };

    await db.collection('timeline_events').add(timelineEventData);
    console.log(`✅ 创建时间线事件: ${timelineEventData.title}`);

    // 8. 创建工单
    console.log('8. 创建测试工单...');
    const ticketId = uuidv4();
    const ticketData = {
      _id: ticketId,
      robot_id: robotId,
      title: '关节异响检查',
      description: '机器人运行过程中关节部位出现异常声音',
      status: 'open',
      priority: 'medium',
      assigned_to: serviceProviderAdmin._id,
      created_by: customerUserId,
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        expected_resolution_date: new Date(new Date().setDate(new Date().getDate() + 3)),
        actual_resolution_date: null,
        resolution_notes: '',
        attachments: [],
        tags: ['关节', '异响'],
      },
    };

    await db.collection('tickets').add(ticketData);
    console.log(`✅ 创建测试工单: ${ticketData.title}`);

    console.log('\n🎉 测试数据创建完成！');
    console.log('\n==========================================');
    console.log('📋 测试账户信息：');
    console.log('==========================================');
    console.log('\n1. 服务商管理员账户：');
    console.log('   邮箱: admin@test.com');
    console.log('   密码: (您设置的密码)');
    console.log('\n2. 终端客户管理员账户：');
    console.log('   邮箱: customer_admin@test.com');
    console.log('   密码: customer123');
    console.log('\n3. 终端客户工程师账户：');
    console.log('   邮箱: customer_engineer@test.com');
    console.log('   密码: engineer123');
    console.log('\n4. 测试机器人信息：');
    console.log(`   序列号: ${robotData.sn}`);
    console.log(`   型号: ${robotData.brand} ${robotData.model}`);
    console.log(`   位置: ${robotData.location}`);
    console.log('\n==========================================');
    console.log('🔗 直接访问链接：');
    console.log(`   登录页: http://localhost:3000/`);
    console.log(`   机器人列表: http://localhost:3000/robots`);
    console.log(`   机器人详情: http://localhost:3000/robots/${robotId}`);
    console.log('==========================================');

  } catch (error: any) {
    console.error('❌ 创建测试数据失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 执行脚本
createTestCustomer();