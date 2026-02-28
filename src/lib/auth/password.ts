// src/lib/auth/password.ts - 密码管理
import bcrypt from 'bcryptjs';

export class PasswordManager {
  private saltRounds = 12;
  
  // 哈希密码
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }
  
  // 验证密码
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  // 验证密码强度
  validateStrength(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('密码长度至少8位');
    }
    
    if (password.length > 100) {
      errors.push('密码长度不能超过100位');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  // 生成随机密码
  generateRandomPassword(length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  }
}

export const passwordManager = new PasswordManager();