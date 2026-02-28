import type { NextApiRequest, NextApiResponse } from 'next';
import { sessionManager } from '@/lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // 简单的鉴权：通过一个环境变量里的 token
  const authHeader = req.headers['x-cron-secret'];
  if (authHeader !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const deletedCount = await sessionManager.cleanupExpiredSessions();
    return res.status(200).json({ success: true, deletedCount });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}