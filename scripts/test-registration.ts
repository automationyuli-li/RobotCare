// scripts/test-registration.ts
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testRegistration() {
  console.log('🔍 测试注册功能...');
  
  try {
    // 测试数据
    const testData = {
      organizationName: '测试公司',
      contactEmail: `test${Date.now()}@example.com`,
      contactPhone: '13800138000',
      adminEmail: `admin${Date.now()}@example.com`,
      adminPassword: 'Test123456',
      adminDisplayName: '测试管理员',
      subscriptionPlan: 'free',
    };
    
    console.log('📝 测试数据:', testData);
    
    // 调用注册接口
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    console.log('📊 响应状态:', response.status);
    console.log('📦 响应数据:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ 注册测试成功！');
    } else {
      console.log('❌ 注册测试失败:', result.error);
    }
    
  } catch (error: any) {
    console.error('🔥 测试过程错误:', error.message);
  }
}

testRegistration();