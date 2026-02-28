// src/lib/auth/session.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/operations';

export class SessionManager {
  async createSession(user: any): Promise<string> {
    try {
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时
      
      const sessionData = {
        sessionId: sessionId,
        userId: user._id,
        orgId: user.org_id,
        userEmail: user.email,
        role: user.role,
        createdAt: new Date(),
        expiresAt: expiresAt,
        userAgent: 'web', // 可以扩展
        ipAddress: '127.0.0.1', // 在生产环境中从request获取
      };
      
      await db.insert('sessions', sessionData);
      console.log('Session created:', sessionId);
      
      return sessionId;
      
    } catch (error) {
      console.error('Create session error:', error);
      throw new Error('Failed to create session');
    }
  }
  
  async verifySession(sessionToken: string): Promise<any> {
    try {
      console.log('Verifying session token:', sessionToken);
      
      // 关键：按照 sessionId 查找，而不是 _id
      const session = await db.findOne('sessions', { 
        sessionId: sessionToken,
        expiresAt: { $gt: new Date() }
      });
      
      if (!session) {
        console.log('Session not found:', sessionToken);
        return null;
      }
      
      // 更新最后访问时间（可选）
      await db.update('sessions', session._id, {
        lastAccessedAt: new Date(),
      });
      
      return session;
      
    } catch (error) {
      console.error('Verify session error:', error);
      return null;
    }
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    try {
      await db.delete('sessions', {sessionId: sessionToken});
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
  
  async destroySession(sessionToken: string): Promise<boolean> {
    try {
      const session = await db.findOne('sessions', { sessionId: sessionToken });
      if (session) {
        await db.delete('sessions', session._id);
      }
      return true;
    } catch (error) {
      console.error('Destroy session error:', error);
      return false;
    }
  }
  
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const result = await db.deleteMany('sessions', {
        expiresAt: { $lt: now }, // 已经过期的
      });
      console.log('Cleaned expired sessions:', result);
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
      throw error;
    }
  }
}

export const sessionManager = new SessionManager();