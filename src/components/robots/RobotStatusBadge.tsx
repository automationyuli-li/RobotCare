// src/components/robots/RobotStatusBadge.tsx
'use client';

import { CheckCircle, AlertCircle, Clock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface RobotStatusBadgeProps {
  status: 'active' | 'maintenance' | 'fault' | 'inactive';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
}
const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  active: {
    label: '运行正常',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  maintenance: {
    label: '维护中',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: Clock,
  },
  fault: {
    label: '故障',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: AlertCircle,
  },
  inactive: {
    label: '离线',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: Ban,
  },
};

const SIZE_CONFIG = {
  sm: {
    text: 'text-xs',
    padding: 'px-2 py-0.5',
    iconSize: 'w-3 h-3',
  },
  md: {
    text: 'text-sm',
    padding: 'px-2.5 py-1',
    iconSize: 'w-3.5 h-3.5',
  },
  lg: {
    text: 'text-base',
    padding: 'px-3 py-1.5',
    iconSize: 'w-4 h-4',
  },
};

export function RobotStatusBadge({ 
  status = 'inactive', 
  size = 'md',
  showIcon = true 
}: RobotStatusBadgeProps) {
  // 获取状态配置，如果状态不在配置中，使用默认值
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.inactive;
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = statusConfig.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        statusConfig.bgColor,
        statusConfig.color,
        sizeConfig.padding,
        sizeConfig.text
      )}
    >
      {showIcon && (
        <Icon className={cn('mr-1.5', sizeConfig.iconSize)} />
      )}
      {statusConfig.label}
    </div>
  );
}

// 可选：导出一个辅助函数用于其他地方获取状态信息
export function getRobotStatusInfo(status?: string) {
  return STATUS_CONFIG[status || 'inactive'] || STATUS_CONFIG.inactive;
}
