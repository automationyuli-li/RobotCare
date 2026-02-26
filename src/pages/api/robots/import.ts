// src/pages/api/robots/import.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable'; // 修改导入方式
import { promises as fs } from 'fs';
import path from 'path';
import xlsx from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '只允许POST请求' });
  }

  try {
    // 检查content-type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ 
        success: false, 
        error: '请求格式错误，必须是multipart/form-data' 
      });
    }

    // 解析上传的文件
    const form = new IncomingForm({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB限制
    });

    const parseForm = () => new Promise<any>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const { files } = await parseForm();
    
    const file = (files.file as File[])?.[0];
    
    if (!file) {
      return res.status(400).json({ 
        success: false, 
        error: '未找到上传的文件' 
      });
    }

    // 验证文件扩展名
    const ext = path.extname(file.originalFilename || '').toLowerCase();
    if (!['.xlsx', '.xls'].includes(ext)) {
      await fs.unlink(file.filepath).catch(() => {});
      return res.status(400).json({ 
        success: false, 
        error: '只支持.xlsx和.xls格式的文件' 
      });
    }

    // 读取Excel文件
    const workbook = xlsx.readFile(file.filepath);
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      await fs.unlink(file.filepath).catch(() => {});
      return res.status(400).json({ 
        success: false, 
        error: 'Excel文件不包含任何工作表' 
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON - 兼容不同的表头格式
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
    
    // 处理数据，兼容不同的表头命名
    const robots = rawData.map((row: any) => {
      // 尝试不同的表头字段名
      const sn = row.SN || row.sn || row.序列号 || '';
      const brand = row.Brand || row.brand || row.品牌 || '';
      const model = row.Model || row.model || row.型号 || '';
      const location = row.Location || row.location || row.位置 || '';
      const manufactureDate = row.Manufacture_date || row.manufacture_date || row.制造日期 || '';
      const warrantyEnd = row.Warranty_end || row.warranty_end || row.保修截止 || '';

      return {
        sn: String(sn).trim(),
        brand: String(brand).trim(),
        model: String(model).trim(),
        location: String(location).trim() || undefined,
        manufacture_date: manufactureDate ? new Date(manufactureDate) : undefined,
        warranty_end: warrantyEnd ? new Date(warrantyEnd) : undefined,
      };
    }).filter(robot => {
      // 过滤掉空行
      return robot.sn && robot.brand && robot.model;
    });

    // 删除临时文件
    await fs.unlink(file.filepath);

    if (robots.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Excel文件中没有有效的机器人数据' 
      });
    }

    // 检查重复的序列号
    const snSet = new Set();
    const duplicates = [];
    
    for (const robot of robots) {
      if (snSet.has(robot.sn)) {
        duplicates.push(robot.sn);
      }
      snSet.add(robot.sn);
    }

    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        error: `发现重复的序列号: ${duplicates.join(', ')}`,
        data: robots,
      });
    }

    return res.status(200).json({
      success: true,
      data: robots,
      message: `成功解析 ${robots.length} 条记录`,
    });
    
  } catch (error: any) {
    console.error('Error importing robots:', error);
    
    let errorMessage = '文件解析失败';
    
    if (error.message?.includes('maxFileSize')) {
      errorMessage = '文件大小不能超过10MB';
    } else if (error.code === 'ENOENT') {
      errorMessage = '文件不存在';
    } else if (error.message?.includes('Unexpected')) {
      errorMessage = '文件格式错误，请上传有效的Excel文件';
    }

    return res.status(500).json({ 
      success: false, 
      error: `${errorMessage}: ${error.message}` 
    });
  }
}

export default handler;