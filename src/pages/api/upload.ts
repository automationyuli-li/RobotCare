// src/pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, withErrorHandler, allowMethods } from '@/lib/api';
import { uploadFile } from '@/lib/storage'; // 您已有的上传函数
import { IncomingForm } from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

export default withErrorHandler(
  withAuth(
    allowMethods(['POST'])(
      async (req: NextApiRequest, res: NextApiResponse) => {
        const form = new IncomingForm({ multiples: true });
        form.parse(req, async (err, fields, files) => {
          if (err) {
            return res.status(400).json({ success: false, error: '解析失败' });
          }
          const file = Array.isArray(files.file) ? files.file[0] : files.file;
          if (!file) {
            return res.status(400).json({ success: false, error: '未提供文件' });
          }
          try {
            const content = await fs.promises.readFile(file.filepath);
            const fileId = await uploadFile(content, `attachments/${Date.now()}_${file.originalFilename}`);
            // 返回文件元数据
            res.status(200).json({
              success: true,
              data: {
                fileId,
                name: file.originalFilename,
                size: file.size,
                type: file.mimetype,
                url: `/api/files/${fileId}`, // 或真实的访问 URL
              },
            });
          } catch (error) {
            res.status(500).json({ success: false, error: '上传失败' });
          }
        });
      }
    )
  )
);