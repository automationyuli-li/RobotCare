// scripts/debug-session.js
import fetch from 'node-fetch';

async function debugSession() {
  console.log('=== RobotCare Session Debug ===\n');
  
  // 1. 测试登录
  console.log('1. Testing login...');
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'your_password' // 使用你的密码
      }),
    });
    
    console.log('Login status:', loginRes.status);
    console.log('Login headers:', [...loginRes.headers.entries()]);
    
    const loginData = await loginRes.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    // 2. 获取cookie
    const setCookie = loginRes.headers.get('set-cookie');
    console.log('\nSet-Cookie header:', setCookie);
    
    if (setCookie) {
      const sessionMatch = setCookie.match(/session=([^;]+)/);
      if (sessionMatch) {
        const sessionToken = sessionMatch[1];
        console.log('\nExtracted session token:', sessionToken);
        console.log('Token length:', sessionToken.length);
        console.log('Token looks like UUID?', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionToken));
        
        // 3. 直接查询数据库
        console.log('\n3. Checking database directly...');
        // 这里需要你的数据库连接代码
      }
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugSession();