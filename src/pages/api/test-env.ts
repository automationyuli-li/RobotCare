import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Test API called');
  console.log('CLOUDBASE_ENV_ID:', process.env.CLOUDBASE_ENV_ID ? 'exists' : 'missing');
  console.log('CLOUDBASE_SECRET_ID:', process.env.CLOUDBASE_SECRET_ID ? 'exists' : 'missing');
  console.log('CLOUDBASE_SECRET_KEY:', process.env.CLOUDBASE_SECRET_KEY ? 'exists' : 'missing');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  res.status(200).json({
    envIdExists: !!process.env.CLOUDBASE_ENV_ID,
    secretIdExists: !!process.env.CLOUDBASE_SECRET_ID,
    secretKeyExists: !!process.env.CLOUDBASE_SECRET_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
}