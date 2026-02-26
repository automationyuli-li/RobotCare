// src/app/tickets/[id]/components/GanttChart.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Target } from 'lucide-react';

interface Stage {
  _id?: string;
  stage_type: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  expected_date?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  color?: string;
  created_at?: string;
  completed_at?: string;
}

interface GanttChartProps {
  ticketId: string;
  stages: Stage[];
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  abnormal_description: { label: '异常描述', color: 'bg-blue-500' },
  abnormal_analysis: { label: '异常分析', color: 'bg-purple-500' },
  required_parts: { label: '所需备件', color: 'bg-amber-500' },
  on_site_solution: { label: '现场解决', color: 'bg-green-500' },
  summary: { label: '完成总结', color: 'bg-indigo-500' },
  customer_confirmation: { label: '客户确认', color: 'bg-teal-500' },
};

export default function GanttChart({ ticketId, stages }: GanttChartProps) {
  const [timeScale, setTimeScale] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timelineStages, setTimelineStages] = useState<Stage[]>([]);
  
  useEffect(() => {
    // 处理阶段数据，为每个阶段生成时间范围
    const processedStages = stages
      .filter(stage => stage.expected_date) // 只显示有预期完成时间的阶段
      .map(stage => {
        const config = STAGE_CONFIG[stage.stage_type] || { label: stage.stage_type, color: 'bg-gray-400' };
        
        // 计算开始日期（使用创建日期或工单创建日期）
        let startDate = stage.created_at ? new Date(stage.created_at) : new Date();
        
        // 计算结束日期（使用预期完成日期或当前日期）
        let endDate = stage.expected_date ? new Date(stage.expected_date) : new Date();
        
        // 如果结束日期早于开始日期，调整结束日期
        if (endDate < startDate) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }
        
        return {
          ...stage,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          title: config.label,
          color: config.color
        };
      })
      .sort((a, b) => {
        // 按阶段顺序排序
        const order = ['abnormal_description', 'abnormal_analysis', 'required_parts', 'on_site_solution', 'summary', 'customer_confirmation'];
        return order.indexOf(a.stage_type) - order.indexOf(b.stage_type);
      });
    
    setTimelineStages(processedStages);
  }, [stages]);
  
  // 生成14天的时间线
  const generateTimelineDays = () => {
    const days = [];
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 7); // 从7天前开始
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    
    return days;
  };
  
  const days = generateTimelineDays();
  
  // 计算阶段在时间线上的位置
  const calculateStagePosition = (stage: Stage) => {
    if (!stage.start_date || !stage.end_date) return { start: 0, end: 0, width: 0 };
    
    const startDate = new Date(stage.start_date);
    const endDate = new Date(stage.end_date);
    
    // 找到开始和结束日期在days数组中的索引
    const startIndex = days.findIndex(day => 
      day.toDateString() === startDate.toDateString()
    );
    const endIndex = days.findIndex(day => 
      day.toDateString() === endDate.toDateString()
    );
    
    return {
      start: Math.max(0, startIndex === -1 ? 0 : startIndex),
      end: Math.min(13, endIndex === -1 ? 13 : endIndex),
      width: endIndex === -1 || startIndex === -1 ? 1 : Math.max(1, (endIndex - startIndex + 1))
    };
  };
  
  // 获取阶段状态的不透明度
  const getStageOpacity = (status?: string) => {
    switch (status) {
      case 'completed': return 'opacity-100';
      case 'in_progress': return 'opacity-80';
      default: return 'opacity-60';
    }
  };
  
  return (
    <div className="relative">
      {/* 时间刻度 */}
      <div className="flex mb-2">
        {days.map((day, index) => (
          <div
            key={index}
            className="flex-1 text-center text-xs text-gray-500 border-r border-gray-200 py-2"
          >
            <div className="font-medium">{day.getDate()}</div>
            <div className="text-gray-400">
              {day.toLocaleDateString('zh-CN', { weekday: 'short' })}
            </div>
          </div>
        ))}
      </div>
      
      {/* 甘特图主体 */}
      <div className="relative h-32">
        {/* 网格线 */}
        <div className="absolute inset-0 flex">
          {days.map((_, index) => (
            <div
              key={index}
              className={`flex-1 border-r ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
            />
          ))}
        </div>
        
        {/* 阶段条 */}
        {timelineStages.map((stage, index) => {
          const position = calculateStagePosition(stage);
          const stageConfig = STAGE_CONFIG[stage.stage_type] || { color: 'bg-gray-400', label: stage.stage_type };
          
          return (
            <motion.div
              key={stage._id || index}
              className={`absolute h-8 rounded-lg ${stageConfig.color} ${getStageOpacity(stage.status)} flex items-center px-2 shadow-sm`}
              style={{
                left: `${(position.start / 14) * 100}%`,
                width: `${(position.width / 14) * 100}%`,
                top: `${20 + (index % 3) * 12}px`, // 堆叠显示避免重叠
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              title={`${stageConfig.label}: ${stage.start_date} 至 ${stage.end_date}`}
            >
              <span className="text-xs font-medium text-white truncate">
                {stageConfig.label}
              </span>
            </motion.div>
          );
        })}
        
        {/* 当前时间线 */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" 
          style={{ left: `${(7 / 14) * 100}%` }}>
          <div className="absolute -top-2 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="absolute -bottom-2 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
        </div>
      </div>
      
      {/* 图例 */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-700">异常描述</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-700">异常分析</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-700">所需备件</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">现场解决</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-sm text-gray-700">完成总结</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-teal-500"></div>
            <span className="text-sm text-gray-700">客户确认</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setTimeScale('day')}
            className={`px-3 py-1 rounded-lg text-sm ${
              timeScale === 'day'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            日视图
          </button>
          <button
            onClick={() => setTimeScale('week')}
            className={`px-3 py-1 rounded-lg text-sm ${
              timeScale === 'week'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            周视图
          </button>
        </div>
      </div>
    </div>
  );
}