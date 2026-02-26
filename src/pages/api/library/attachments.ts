// src/pages/api/library/attachments.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { api, withErrorHandler, withAuth } from '@/lib/api';
import LibraryOperations from '@/lib/db/library-operations';
import { permissionManager } from '@/lib/auth/permissions';
import { storage as cloudbaseStorage } from '@/lib/cloudbase';
import { db } from '@/lib/db/operations';

export const config = {
  api: {
    bodyParser: false,
  },
};

function getFieldValue(field: any): string {
  if (Array.isArray(field)) {
    return field[0] || '';
  }
  return field || '';
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  if (req.method === 'POST') {
    try {
      // 检查权限
      const hasCreatePermission = permissionManager.hasPermission(
        user.role as any,
        'documents',
        'create'
      );
      
      if (!hasCreatePermission) {
        return api.forbidden(res, '没有上传附件的权限');
      }

      // 解析form-data
      const form = new IncomingForm({
        multiples: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        keepExtensions: true,
      });

      return new Promise((resolve, reject) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error('解析上传文件失败:', err);
            return api.badRequest(res, '文件解析失败');
          }

          const document_id = getFieldValue(fields.document_id);
          const content_section = getFieldValue(fields.content_section);
          const description = getFieldValue(fields.description);

          if (!document_id || !content_section || !files.file) {
            return api.badRequest(res, '缺少必要参数');
          }
          const file = Array.isArray(files.file) ? files.file[0] : files.file;

          try {
            // 验证文档是否存在且有权限
            const document = await LibraryOperations.getDocumentById(document_id);
            if (!document) {
                if (fs.existsSync(file.filepath)) {
                    fs.unlinkSync(file.filepath);
                }
              return api.notFound(res, '文档不存在');
            }

            // 只有文档所属组织的服务商可以上传附件
            if (!user.role.includes('service') || document.org_id !== user.org_id) {
              if (fs.existsSync(file.filepath)) {
                    fs.unlinkSync(file.filepath);
                }
                return api.forbidden(res, '只能为自己组织的文档上传附件');
            }
            
            // 生成唯一文件名
            const fileExt = path.extname(file.originalFilename || '');
            const fileName = `${uuidv4()}${fileExt}`;
            const cloudPath = `library/${document.org_id}/${fileName}`;

            // 读取文件内容
            const fileBuffer = fs.readFileSync(file.filepath);
            // 上传到云存储
            const uploadResult = await cloudbaseStorage.uploadFile({
                cloudPath: cloudPath,
                fileContent: fileBuffer,
            });

            const fileID = uploadResult.fileID || cloudPath;

            // 创建附件记录
            const attachment = await LibraryOperations.createAttachment({
              document_id: document_id,
              file_name: file.originalFilename || file.newFilename || fileName,
              file_type: file.mimetype || 'application/octet-stream',
              file_size: file.size,
              cloud_path: cloudPath,
              content_section: content_section as any,
              description: description as string,
              uploaded_by: user._id,
              sort_order: 0, // 可以后续实现排序功能
            });

            // 清理临时文件
            fs.unlinkSync(file.filepath);

            return api.created(res, {
              attachment,
              file_url: `https://${process.env.CLOUDBASE_ENV_ID}.tcb.qcloud.la/${fileID}`,
              file_id: fileID,
            }, '附件上传成功');
            
          } catch (uploadError: any) {
            //清理临时文件
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
            console.error('上传附件失败:', uploadError);
            return api.internalError(res, '上传附件失败: ' + uploadError.message);
          }
        });
      });
      
    } catch (error: any) {
      console.error('附件上传失败:', error);
      return api.internalError(res, '附件上传失败: ' + error.message);
    }
  }

  return api.methodNotAllowed(res);
}

export default withErrorHandler(withAuth(handler));