// src/components/ui/GanttChart.tsx
'use client';

import { motion } from 'framer-motion';
import { format, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface GanttItem {
  stage: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  color: string;
}

interface GanttChartProps {
  data: GanttItem[];
  startDate: Date;
  endDate: Date;
  height?: number;
}

const STAGE_COLORS = {
  abnormal_description: '#3b82f6', // blue-500
  abnormal_analysis: '#8b5cf6',    // purple-500
  required_parts: '#f59e0b',       // amber-500
  on_site_solution: '#10b981',     // emerald-500
  summary: '#6366f1',              // indigo-500
  customer_confirmation: '#059669' // emerald-600
};

const STAGE_NAMES = {
  abnormal_description: '异常描述',
  abnormal_analysis: '异常分析',
  required_parts: '所需备件',
  on_site_solution: '现场解决',
  summary: '完成总结',
  customer_confirmation: '客户确认'
};

export function GanttChart({ data, startDate, endDate, height = 200 }: GanttChartProps) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalDays = days.length;
  
  const getStageColor = (stage: string) => {
    return STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || '#6b7280';
  };
  
  const getStageName = (stage: string) => {
    return STAGE_NAMES[stage as keyof typeof STAGE_NAMES] || stage;
  };
  
  const calculatePosition = (item: GanttItem) => {
    const start = new Date(item.start_date);
    const end = new Date(item.end_date);
    
    // 计算相对于时间轴开始日期的位置
    const startDiff = Math.max(0, Math.floor((start.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const endDiff = Math.min(totalDays, Math.floor((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const width = ((endDiff - startDiff + 1) / totalDays) * 100;
    const left = (startDiff / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };
  
  return (
    <div className="relative" style={{ height: `${height + 60}px` }}>
      {/* 时间轴刻度 */}
      <div className="absolute top-0 left-0 right-0 h-8 border-b border-gray-200">
        <div className="flex h-full">
          {days.map((day, index) => (
            <div
              key={day.toISOString()}
              className="flex-1 border-r border-gray-200 last:border-r-0 relative"
            >
              {index % 2 === 0 && (
                <div className="absolute top-2 left-0 right-0 text-center">
                  <span className="text-xs text-gray-500">
                    {format(day, 'MM/dd', { locale: zhCN })}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* 甘特图主体 */}
      <div className="absolute top-8 left-0 right-0" style={{ height: `${height}px` }}>
        {/* 网格线 */}
        <div className="absolute inset-0">
          {days.map((_, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0 border-r border-gray-100"
              style={{ left: `${(index / totalDays) * 100}%` }}
            />
          ))}
        </div>
        
        {/* 今天指示线 */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: '50%' }}
          animate={{
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <div className="absolute -top-2 -left-2 px-2 py-1 bg-red-500 text-white text-xs rounded whitespace-nowrap">
            今天
          </div>
        </motion.div>
        
        {/* 阶段条 */}
        {data.map((item, index) => {
          const position = calculatePosition(item);
          const color = getStageColor(item.stage);
          
          return (
            <motion.div
              key={item.stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="absolute rounded-lg flex items-center group"
              style={{
                ...position,
                top: `${index * 32}px`,
                height: '28px',
                backgroundColor: color,
              }}
            >
              {/* 阶段条内容 */}
              <div className="flex items-center justify-between px-3 w-full">
                <span className="text-xs font-medium text-white truncate">
                  {getStageName(item.stage)}
                </span>
                
                {/* 状态指示器 */}
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'completed' ? 'bg-green-300' :
                    item.status === 'in_progress' ? 'bg-yellow-300' :
                    'bg-white/50'
                  }`} />
                </div>
              </div>
              
              {/* 悬停提示 */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 
                            bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 
                            transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div className="font-medium mb-1">{getStageName(item.stage)}</div>
                <div className="text-gray-300">
                  {format(new Date(item.start_date), 'MM/dd')} - {format(new Date(item.end_date), 'MM/dd')}
                </div>
                <div className={`mt-1 ${
                  item.status === 'completed' ? 'text-green-300' :
                  item.status === 'in_progress' ? 'text-yellow-300' :
                  'text-gray-400'
                }`}>
                  {item.status === 'completed' ? '已完成' :
                   item.status === 'in_progress' ? '进行中' : '未开始'}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* 图例 */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-2 pt-4">
        {Object.entries(STAGE_NAMES).map(([key, name]) => (
          <div key={key} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: STAGE_COLORS[key as keyof typeof STAGE_COLORS] }}
            />
            <span className="text-xs text-gray-600">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}