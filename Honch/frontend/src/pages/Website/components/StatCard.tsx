import { RiArrowUpLine, RiArrowDownLine } from '@remixicon/react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard = ({ label, value, delta, trend }: StatCardProps) => (
  <div className="flex flex-col bg-foreground border border-border rounded-md p-4 min-w-[120px]">
    <span className="text-xs text-copy-light uppercase font-semibold tracking-wider">{label}</span>
    <div className="flex items-end gap-2 mt-1">
      <span className="text-xl font-bold text-copy">{value}</span>
      {delta && (
        <div className={`flex items-center text-xs font-medium mb-1 ${trend === 'up' ? 'text-green-500' :
            trend === 'down' ? 'text-red-500' : 'text-copy-light'
          }`}>
          {trend === 'up' && <RiArrowUpLine size={16} className="mr-0.5" />}
          {trend === 'down' && <RiArrowDownLine size={16} className="mr-0.5" />}
          <span>{delta}</span>
        </div>
      )}
    </div>
  </div>
);

export default StatCard;