// src/app/robots/new/page.tsx
'use client';

import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  X,
  Plus,
  Bot,
  Cpu,
  MapPin,
  Calendar,
  Shield,
  Building,
  User,
  AlertCircle,
  Download,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Navigation from '@/components/layout/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRef } from 'react';

interface Organization {
  _id: string;
  name: string;
  type: 'service_provider' | 'end_customer';
  contact_email: string;
  contract_end_date?: Date;
}

interface ExcelRobot {
  sn: string;
  brand: string;
  model: string;
  location?: string;
  installation_date?: string;
  warranty_end?: string;
}

export default function CreateRobotPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partners, setPartners] = useState<Organization[]>([]);
  const [excelData, setExcelData] = useState<ExcelRobot[]>([]);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    sn: '',
    brand: '',
    model: '',
    location: '',
    status: 'active' as 'active' | 'maintenance' | 'fault' | 'inactive',
    specs: {
      manufacture_date: '',
      warranty_end: '',
      operating_hours: '',
    },
  });

  // 错误状态
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  // 获取签约的合作伙伴
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/organizations/contracts');
      const data = await response.json();
      if (data.success) {
        setPartners(data.data);
        // 如果只有一个合作伙伴，自动选中
        if (data.data.length === 1) {
          setSelectedPartnerId(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('specs.')) {
      const specField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        specs: {
          ...prev.specs,
          [specField]: value,
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    // 清除字段错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.sn) newErrors.sn = '序列号不能为空';
    if (!formData.brand) newErrors.brand = '品牌不能为空';
    if (!formData.model) newErrors.model = '型号不能为空';
    
    // 如果是终端客户，必须选择服务商
    if (user?.role.includes('end') && !selectedPartnerId) {
      newErrors.partner = '请选择服务商';
    }
    // 如果是服务商，必须选择客户
    if (user?.role.includes('service') && !selectedPartnerId) {
      newErrors.partner = '请选择客户';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 构建机器人数据
      const robotData = {
        sn: formData.sn,
        brand: formData.brand,
        model: formData.model,
        location: formData.location || undefined,
        status: formData.status,
        specs: {
          manufacture_date: formData.specs.manufacture_date ? new Date(formData.specs.manufacture_date) : undefined,
          warranty_end: formData.specs.warranty_end ? new Date(formData.specs.warranty_end) : undefined,
          operating_hours: formData.specs.operating_hours ? parseInt(formData.specs.operating_hours) : undefined,
        },
        // 根据用户角色设置组织ID
        org_id: user?.role.includes('service') ? selectedPartnerId : user?.org_id,
        service_provider_id: user?.role.includes('end') ? selectedPartnerId : user?.org_id,
      };

      const response = await fetch('/api/robots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(robotData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建机器人失败');
      }

      // 创建成功，跳转到机器人列表
      router.push('/robots');
      
    } catch (error: any) {
      console.error('Error creating robot:', error);
      setServerError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setServerError ('请选择文件');
      return;
    }

  // 检查文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
      setServerError('请上传Excel文件（.xlsx 或 .xls 格式');
      return;
    }

    // 检查文件大小（限制10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setServerError('文件大小不能超过10MB');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setServerError('');

    try {
      // 读取Excel文件
      const formData = new FormData();
      formData.append('file', file);

      console.log('开始上传文件:', file.name, '大小:', file.size); // 调试

      const response = await fetch('/api/robots/import', {
        method: 'POST',
        body: formData,
        // 不要设置Content-Type，浏览器会自动添加正确的边界
      });

      console.log('响应状态:', response.status); // 调试

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Excel解析失败');
      }

      console.log('解析数据:', data); // 调试

      if (data.success) {
        setExcelData(data.data);
        setShowExcelPreview(true);
      } else {
        throw new Error(data.error || 'Excel解析失败');
      }
    } catch (error: any) {
      console.error('Error uploading Excel:', error);
      setServerError(error.message || '文件上传失败,请检查文件格式');
    } finally {
      setUploading(false);
      // 重置文件输入
      if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    }
  };

  const handleBulkImport = async () => {
    if (excelData.length === 0 || !selectedPartnerId) return;

    setLoading(true);
    setServerError('');

    try {
      const robotsToImport = excelData.map(robot => ({
        ...robot,
        status: 'active' as const,
        org_id: user?.role.includes('service') ? selectedPartnerId : user?.org_id,
        service_provider_id: user?.role.includes('end') ? selectedPartnerId : user?.org_id,
        specs: {
          manufacture_date: robot.installation_date ? new Date(robot.installation_date) : undefined,
          warranty_end: robot.warranty_end ? new Date(robot.warranty_end) : undefined,
        },
      }));

      const response = await fetch('/api/robots/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robots: robotsToImport }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '批量导入失败');
      }

      // 导入成功，跳转到机器人列表
      router.push('/robots');
      
    } catch (error: any) {
      console.error('Error importing robots:', error);
      setServerError(error.message);
    } finally {
      setLoading(false);
    }
  };
  // 下载标准模板
const downloadStandardTemplate = () => {
  try {
    // 模板数据
    const templateData = [
      {
        SN: 'UR10e-2023-001',
        Brand: 'Universal Robots',
        Model: 'UR10e',
        Location: '装配线 #3',
        Manufacture_date: '2023-01-15',
        Warranty_end: '2025-01-15',
        Status: 'active',
        Operating_hours: '1250',
      },
      {
        SN: 'IRB-2023-002',
        Brand: 'ABB',
        Model: 'IRB 6700',
        Location: '焊接站 #1',
        Manufacture_date: '2023-02-20',
        Warranty_end: '2025-02-20',
        Status: 'active',
        Operating_hours: '890',
      },
    ];

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    const wscols = [
      { wch: 20 }, // SN
      { wch: 25 }, // Brand
      { wch: 20 }, // Model
      { wch: 20 }, // Location
      { wch: 15 }, // Manufacture_date
      { wch: 15 }, // Warranty_end
      { wch: 12 }, // Status
      { wch: 15 }, // Operating_hours
    ];
    ws['!cols'] = wscols;

    // 设置表头样式
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } }, // 蓝色背景
        alignment: { horizontal: "center" }
      };
    }

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '机器人数据');
    
    // 添加说明工作表
    const instructions = [
      ['📋 机器人数据导入模板说明'],
      [],
      ['字段说明:'],
      ['SN', '序列号，必填，唯一标识，如: UR10e-2023-001'],
      ['Brand', '品牌，必填，如: Universal Robots, ABB, KUKA'],
      ['Model', '型号，必填，如: UR10e, IRB 6700'],
      ['Location', '位置，可选，如: 装配线 #3, 焊接站'],
      ['Manufacture_date', '制造日期，可选，格式: YYYY-MM-DD'],
      ['Warranty_end', '保修截止，可选，格式: YYYY-MM-DD'],
      ['Status', '状态，可选，值: active/maintenance/fault/inactive'],
      ['Operating_hours', '运行时长(小时)，可选，数字'],
      [],
      ['注意事项:'],
      ['1. 请勿修改表头名称'],
      ['2. 日期格式必须为 YYYY-MM-DD'],
      ['3. 序列号不能重复'],
      ['4. 删除示例数据，填写您自己的数据'],
      ['5. 保存后上传文件进行导入'],
    ];
    
    const ws2 = XLSX.utils.aoa_to_sheet(instructions);
    const ws2Cols = [
      { wch: 30 }, // 第一列
      { wch: 50 }, // 第二列
    ];
    ws2['!cols'] = ws2Cols;
    XLSX.utils.book_append_sheet(wb, ws2, '使用说明');
    // 生成并下载文件
    XLSX.writeFile(wb, 'RobotCare_机器人导入模板_标准版.xlsx');
    
  } catch (error) {
    console.error('下载模板失败:', error);
    setServerError('模板下载失败，请检查浏览器设置');
  }
  };

  const isServiceProvider = user?.role.includes('service');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/robots')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">创建机器人</h1>
              <p className="text-gray-600 mt-1">
                {isServiceProvider ? '为您的客户添加机器人设备' : '添加您的机器人设备'}
              </p>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {serverError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium">创建失败</p>
                <p className="text-red-600 text-sm mt-1">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧表单 */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 合作伙伴选择 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-blue-500" />
                    {isServiceProvider ? '选择客户' : '选择服务商'}
                  </h3>
                  
                  {partners.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {partners.map(partner => (
                        <div
                          key={partner._id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all
                                    ${selectedPartnerId === partner._id 
                                      ? 'border-blue-500 bg-blue-50/50' 
                                      : 'border-gray-200 hover:border-gray-300'
                                    }`}
                          onClick={() => setSelectedPartnerId(partner._id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{partner.name}</h4>
                              <p className="text-sm text-gray-500">{partner.contact_email}</p>
                            </div>
                            {selectedPartnerId === partner._id && (
                              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          {partner.contract_end_date && (
                            <p className="text-xs text-gray-500">
                              合约到期: {new Date(partner.contract_end_date).toLocaleDateString('zh-CN')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-yellow-700 text-sm">
                        {isServiceProvider 
                          ? '您还没有签约的客户。请先邀请客户签订服务合约。' 
                          : '您还没有签约的服务商。请联系服务商签订服务合约。'
                        }
                      </p>
                    </div>
                  )}
                  
                  {errors.partner && (
                    <p className="text-sm text-red-600">{errors.partner}</p>
                  )}
                </div>

                {/* 机器人基本信息 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Bot className="w-5 h-5 mr-2 text-green-500" />
                    机器人基本信息
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="序列号 (SN)"
                      name="sn"
                      value={formData.sn}
                      onChange={handleChange}
                      error={errors.sn}
                      required
                      disabled={loading}
                      placeholder="如：UR10e-2023-001"
                    />

                    <Input
                      label="品牌"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      error={errors.brand}
                      required
                      disabled={loading}
                      placeholder="如：Universal Robots"
                    />

                    <Input
                      label="型号"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      error={errors.model}
                      required
                      disabled={loading}
                      placeholder="如：UR10e"
                    />

                    <Input
                      label="位置"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="如：装配线 #3"
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {/* 技术规格 */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Cpu className="w-5 h-5 mr-2 text-purple-500" />
                    技术规格
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="装机日期"
                      type="date"
                      name="specs.manufacture_date"
                      value={formData.specs.manufacture_date}
                      onChange={handleChange}
                      disabled={loading}
                      icon={<Calendar className="w-4 h-4" />}
                    />

                    <Input
                      label="保修截止"
                      type="date"
                      name="specs.warranty_end"
                      value={formData.specs.warranty_end}
                      onChange={handleChange}
                      disabled={loading}
                      icon={<Shield className="w-4 h-4" />}
                    />

                    <Input
                      label="运行时长 (小时)"
                      type="number"
                      name="specs.operating_hours"
                      value={formData.specs.operating_hours}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="如：1250"
                    />
                  </div>
                </div>

                {/* 状态选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    初始状态
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'active', label: '运行正常', color: 'bg-green-100 text-green-800' },
                      { value: 'maintenance', label: '维护中', color: 'bg-amber-100 text-amber-800' },
                      { value: 'fault', label: '故障', color: 'bg-red-100 text-red-800' },
                      { value: 'inactive', label: '离线', color: 'bg-gray-100 text-gray-800' },
                    ].map(status => (
                      <button
                        key={status.value}
                        type="button"
                        className={`px-4 py-2 rounded-lg ${status.color} ${
                          formData.status === status.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, status: status.value as any }))}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 提交按钮 */}
                <div className="pt-6 border-t border-gray-200">
                  <Button
                    type="submit"
                    loading={loading}
                    disabled={!selectedPartnerId}
                    fullWidth
                  >
                    {loading ? '创建中...' : '创建机器人'}
                  </Button>
                </div>
              </form>
            </motion.div>

            {/* Excel批量导入 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Excel批量导入卡片 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-500" />
                  Excel批量导入
                </h3>
                
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-4">
                      支持 .xlsx 格式文件
                    </p>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelUpload}
                        ref={fileInputRef}
                        className="hidden"
                        id="excel-upload"
                        disabled={uploading}
                      />
                      <Button
                        variant="outline"
                        icon={<Upload className="w-4 h-4" />}
                        loading={uploading}
                        className="w-full"
                        onClick={()=> fileInputRef.current?.click()}
                      >
                        {uploading ? '上传中...' : '选择Excel文件'}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-4">
                      文件应包含以下列：SN, Brand, Model, Location, Manufacture_date, Warranty_end
                    </p>
                  </div>

                  {/* Excel数据预览 */}
                  {showExcelPreview && excelData.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          检测到 {excelData.length} 条记录
                        </h4>
                        <button
                          onClick={() => {
                            setExcelData([]);
                            setShowExcelPreview(false);
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <div className="text-xs text-gray-500 font-medium grid grid-cols-4 gap-2 mb-2">
                          <span>序列号</span>
                          <span>品牌</span>
                          <span>型号</span>
                          <span>位置</span>
                        </div>
                        {excelData.slice(0, 5).map((robot, index) => (
                          <div key={index} className="text-sm grid grid-cols-4 gap-2 py-2 border-b border-gray-200 last:border-0">
                            <span className="font-medium">{robot.sn}</span>
                            <span>{robot.brand}</span>
                            <span>{robot.model}</span>
                            <span className="truncate">{robot.location || '-'}</span>
                          </div>
                        ))}
                        {excelData.length > 5 && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            ... 还有 {excelData.length - 5} 条记录
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={handleBulkImport}
                        loading={loading}
                        disabled={!selectedPartnerId}
                        fullWidth
                        className="mt-4"
                      >
                        {loading ? '导入中...' : `批量导入 ${excelData.length} 台机器人`}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* 右侧操作指南 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* 操作指南 */}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <h4 className="font-medium text-blue-800 mb-3">操作指南</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 
                                  flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      1
                    </div>
                    <span className="text-blue-700">
                      {isServiceProvider ? '选择您要添加机器人的客户' : '选择为您提供服务的服务商'}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 
                                  flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      2
                    </div>
                    <span className="text-blue-700">
                      填写机器人的基本信息和规格
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 
                                  flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      3
                    </div>
                    <span className="text-blue-700">
                      或使用Excel批量导入多台机器人
                    </span>
                  </li>
                </ul>
              </div>
              {/* Excel模板下载卡片 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FileSpreadsheet className="w-5 h-5 mr-2 text-green-500" />
                  Excel模板下载
                </h4>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    下载标准模板，按照格式填写机器人数据，确保导入成功。
                  </p>
                  
                  <div className="space-y-3">
                    {/* 模板1：标准模板 */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">标准模板</h5>
                          <p className="text-sm text-gray-500">包含所有必需字段</p>
                        </div>
                        <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          推荐
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        包含: SN, Brand, Model, Location, Manufacture_date, Warranty_end
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        icon={<Download className="w-4 h-4" />}
                        onClick={downloadStandardTemplate}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        下载标准模板 (.xlsx)
                      </Button>
                    </div>
                  </div>
              {/* 使用说明 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-900 mb-2">使用说明</h5>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li className="flex items-start">
                    <Check className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    下载模板文件，不要修改表头名称
                  </li>
                  <li className="flex items-start">
                    <Check className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    日期格式请使用 YYYY-MM-DD (如: 2023-01-15)
                  </li>
                  <li className="flex items-start">
                    <Check className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    填写完成后保存文件，然后点击"选择Excel文件"上传
                  </li>
                  <li className="flex items-start">
                    <AlertCircle className="w-3 h-3 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    如果出现导入错误，请检查数据格式
                  </li>
                </ul>
              </div>
            </div>
          </div>

              {/* 权限说明 */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <h4 className="font-medium text-gray-900 mb-3">权限说明</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-gray-600 flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    机器人的所有权归客户所有
                  </li>
                  <li className="text-gray-600 flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    服务商可以查看和添加技术文档
                  </li>
                  <li className="text-gray-600 flex items-start">
                    <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    仅客户管理员可以删除机器人
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}