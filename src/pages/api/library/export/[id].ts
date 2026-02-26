// src/pages/api/library/export/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { api, withErrorHandler, withAuth } from '@/lib/api';
import LibraryOperations from '@/lib/db/library-operations';
import { permissionManager } from '@/lib/auth/permissions';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return api.badRequest(res, '文档ID不能为空');
  }

  if (req.method === 'GET') {
    try {
      // 检查权限
      const hasReadPermission = permissionManager.hasPermission(
        user.role as any,
        'documents',
        'read'
      );
      
      if (!hasReadPermission) {
        return api.forbidden(res, '没有导出权限');
      }

      // 获取文档信息
      const document = await LibraryOperations.getDocumentById(id);
      if (!document) {
        return api.notFound(res, '文档不存在');
      }

      // 检查访问权限
      let hasAccess = false;
      
      if (user.role.includes('service')) {
        hasAccess = document.org_id === user.org_id;
      } else if (user.role.includes('end')) {
        hasAccess = await LibraryOperations.checkCustomerAccess(
          user.org_id,
          document.org_id
        );
      }

      if (!hasAccess) {
        return api.forbidden(res, '没有权限导出该文档');
      }

      // 获取附件
      const attachments = await LibraryOperations.getDocumentAttachments(id);

      // 生成HTML内容
      const htmlContent = generateHTMLExport(document, attachments);

      // 设置响应头
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${document.title}.html"`);
      
      return res.status(200).send(htmlContent);
      
    } catch (error: any) {
      console.error('导出文档失败:', error);
      return api.internalError(res, '导出文档失败: ' + error.message);
    }
  }

  return api.methodNotAllowed(res);
}

// 生成HTML导出内容
function generateHTMLExport(document: any, attachments: any[]) {
  const { title, content, keywords, created_at, updated_at, created_by_name } = document;
  
  // 按内容区域分组附件
  const attachmentsBySection: Record<string, any[]> = {};
  attachments.forEach(attachment => {
    if (!attachmentsBySection[attachment.content_section]) {
      attachmentsBySection[attachment.content_section] = [];
    }
    attachmentsBySection[attachment.content_section].push(attachment);
  });

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0 0 10px 0;
        }
        .meta {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 15px 0;
        }
        .tag {
            background: #e3f2fd;
            color: #1976d2;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
        }
        .section {
            margin-bottom: 40px;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
            white-space: pre-wrap;
        }
        .attachments {
            margin-top: 20px;
        }
        .attachment-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .attachment-item {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }
        .attachment-img {
            max-width: 100%;
            max-height: 200px;
            border-radius: 4px;
        }
        .attachment-name {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
            word-break: break-all;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 12px;
            text-align: center;
        }
        @media print {
            body {
                max-width: none;
                padding: 0;
            }
            .section {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${title}</h1>
        <div class="meta">
            创建时间: ${new Date(created_at).toLocaleDateString('zh-CN')} | 
            最后更新: ${new Date(updated_at).toLocaleDateString('zh-CN')} |
            创建人: ${created_by_name}
        </div>
        <div class="tags">
            ${keywords.map((keyword: string) => `<span class="tag">${keyword}</span>`).join('')}
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">故障现象</h2>
        <div class="content">${content.fault_phenomenon}</div>
        ${attachmentsBySection.fault_phenomenon?.length ? `
        <div class="attachments">
            <h3>相关图片/视频</h3>
            <div class="attachment-grid">
                ${attachmentsBySection.fault_phenomenon.map(att => renderAttachment(att)).join('')}
            </div>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2 class="section-title">诊断步骤</h2>
        <div class="content">${content.diagnosis_steps}</div>
        ${attachmentsBySection.diagnosis_steps?.length ? `
        <div class="attachments">
            <h3>相关图片/视频</h3>
            <div class="attachment-grid">
                ${attachmentsBySection.diagnosis_steps.map(att => renderAttachment(att)).join('')}
            </div>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2 class="section-title">解决方案</h2>
        <div class="content">${content.solution}</div>
        ${attachmentsBySection.solution?.length ? `
        <div class="attachments">
            <h3>相关图片/视频</h3>
            <div class="attachment-grid">
                ${attachmentsBySection.solution.map(att => renderAttachment(att)).join('')}
            </div>
        </div>
        ` : ''}
    </div>

    <div class="section">
        <h2 class="section-title">预防措施</h2>
        <div class="content">${content.preventive_measures}</div>
        ${attachmentsBySection.preventive_measures?.length ? `
        <div class="attachments">
            <h3>相关图片/视频</h3>
            <div class="attachment-grid">
                ${attachmentsBySection.preventive_measures.map(att => renderAttachment(att)).join('')}
            </div>
        </div>
        ` : ''}
    </div>

    <div class="footer">
        本文档由 RobotCare 知识库系统生成<br>
        导出时间: ${new Date().toLocaleString('zh-CN')}<br>
        文档ID: ${document._id}
    </div>
</body>
</html>`;

  return html;
}

// 渲染附件
function renderAttachment(attachment: any) {
  const isImage = attachment.file_type.startsWith('image/');
  const isVideo = attachment.file_type.startsWith('video/');
  
  let content = '';
  
  if (isImage) {
    content = `<img src="${attachment.cloud_path}" alt="${attachment.description || attachment.file_name}" class="attachment-img">`;
  } else if (isVideo) {
    content = `<video controls class="attachment-img">
        <source src="${attachment.cloud_path}" type="${attachment.file_type}">
        您的浏览器不支持视频播放。
    </video>`;
  } else {
    content = `<div>📄 ${attachment.file_name}</div>`;
  }
  
  return `<div class="attachment-item">
      ${content}
      <div class="attachment-name">${attachment.description || attachment.file_name}</div>
  </div>`;
}

export default withErrorHandler(withAuth(handler));