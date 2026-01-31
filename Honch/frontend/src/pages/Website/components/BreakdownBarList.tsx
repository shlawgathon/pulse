import React, { useMemo, useState } from 'react';

interface BreakdownBarListProps {
  title: string;
  data?: any[];
  labelKey: string;
  valueKey: string;
  tableLabel: string;
  loading?: boolean;
  maxItems?: number;
  valueFormatter?: (value: number) => string;
  emptyState?: string;
  showPercent?: boolean;
  sortByValue?: boolean;
  compact?: boolean;
}

const BreakdownBarList: React.FC<BreakdownBarListProps> = ({
  title,
  data,
  labelKey,
  valueKey,
  tableLabel,
  loading,
  maxItems = 6,
  valueFormatter,
  emptyState = 'No data found.',
  showPercent = true,
  sortByValue = true,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }), []);

  const items = useMemo(() => {
    const arr = Array.isArray(data) ? [...data] : [];
    if (sortByValue) {
      arr.sort((a, b) => (Number(b?.[valueKey] || 0) - Number(a?.[valueKey] || 0)));
    }
    return arr;
  }, [data, sortByValue, valueKey]);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item?.[valueKey]) || 0), 0), [items, valueKey]);

  const visibleItems = useMemo(() => (expanded ? items : items.slice(0, maxItems)), [expanded, items, maxItems]);

  const formatValue = (val: number) => {
    if (typeof valueFormatter === 'function') return valueFormatter(val);
    return numberFormatter.format(val);
  };

  return (
    <div className="bg-foreground border border-border rounded-md py-4">
      <div className="flex flex-row items-center justify-between px-4 mb-3">
        <h2 className="font-bold">{title}</h2>
        <span className="text-xs text-copy-light font-medium">{tableLabel}</span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 px-4">
          <div className="h-8 w-full bg-border rounded-md animate-pulse" />
          <div className="h-8 w-full bg-border rounded-md animate-pulse" />
          <div className="h-8 w-full bg-border rounded-md animate-pulse" />
        </div>
      ) : items && items.length > 0 ? (
        <div className="flex flex-col gap-2 px-4 py-1">
          {visibleItems.map((item, index) => {
            const value = Number(item?.[valueKey]) || 0;
            const label = String(item?.[labelKey] ?? '—');
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const percentageLabel = `${percentage.toFixed(1)}%`;
            const titleAttr = `${label} — ${formatValue(value)}${showPercent ? ` (${percentageLabel})` : ''}`;
            return (
              <div key={index} className="flex flex-col gap-1" title={titleAttr}>
                <div className="relative h-8 rounded-md bg-border/40 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(percentage.toFixed(1))} aria-label={label}>
                  <div className="absolute left-0 top-0 h-full bg-border transition-all duration-300" style={{ width: `${percentage}%` }} />
                  <div className="relative z-10 h-full flex items-center justify-between px-3">
                    <span className={`truncate ${compact ? 'text-xs' : 'text-sm'} text-copy`}>{label}</span>
                    <span className="flex items-baseline gap-3">
                      <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-copy`}>{formatValue(value)}</span>
                      {showPercent && <span className="text-[11px] text-copy-light">{percentageLabel}</span>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length > maxItems && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 self-start text-xs font-medium text-copy cursor-pointer hover:underline focus:outline-none"
            >
              {expanded ? 'Show less' : `Show all (${items.length})`}
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-copy-light">{emptyState}</div>
      )}
    </div>
  );
};

export default BreakdownBarList; 