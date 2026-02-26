// src/components/robots/WarrantyStatus.tsx
interface WarrantyStatusProps {
  warrantyEnd?: Date;
}

export function WarrantyStatus({ warrantyEnd }: WarrantyStatusProps) {
  if (!warrantyEnd) {
    return (
      <div className="inline-flex items-center text-gray-500 text-sm">
        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
        保修信息未知
      </div>
    );
  }

  const today = new Date();
  const endDate = new Date(warrantyEnd);
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return (
      <div className="inline-flex items-center text-red-600 text-sm font-medium">
        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
        已过保修期
      </div>
    );
  } else if (daysLeft <= 30) {
    return (
      <div className="inline-flex items-center text-amber-600 text-sm font-medium">
        <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
        保修期剩余 {daysLeft} 天
      </div>
    );
  } else {
    return (
      <div className="inline-flex items-center text-green-600 text-sm font-medium">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
        在保修期内
      </div>
    );
  }
}