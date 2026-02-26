// 在 /src/lib/utils/robot.ts 中创建运行时长计算函数
import type { Robot } from '@/types'; // Adjust the import path based on where Robot type is defined

export function calculateOperatingDuration(robot: Robot): {
  days: number;
  formatted: string;
} {
  if (!robot.specs?.installation_date) {
    return { days: 0, formatted: '未知' };
  }
  
  const installationDate = new Date(robot.specs.installation_date);
  const now = new Date();
  
  // 计算天数差
  const diffTime = Math.abs(now.getTime() - installationDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // 格式化显示
  let formatted = '';
  if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    formatted = `${years}年${remainingDays > 0 ? ` ${remainingDays}天` : ''}`;
  } else if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    formatted = `${months}个月${remainingDays > 0 ? ` ${remainingDays}天` : ''}`;
  } else {
    formatted = `${diffDays}天`;
  }
  
  return {
    days: diffDays,
    formatted
  };
}