import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faChevronLeft, faCalendar } from "@fortawesome/free-solid-svg-icons";
import {
  subDays, subHours, subWeeks, subMonths, subYears,
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear,
  startOfWeek, endOfWeek, isSameDay, format
} from "date-fns";

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
}

type ViewState = 'menu' | 'custom';

type DatePreset = {
  label: string;
  getValue: () => [Date, Date];
};

const DateRangePicker = ({ startDate, endDate, onChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewState>('menu');

  // Calendar state
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);

  // Custom input state
  const [customAmount, setCustomAmount] = useState<number>(7);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setView('menu'); // Reset view on close
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      if (startDate) {
        setViewMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
      }
    } else {
      document.removeEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, startDate]);

  const presets: DatePreset[] = [
    { label: 'Today', getValue: () => [startOfDay(new Date()), endOfDay(new Date())] },
    { label: 'Yesterday', getValue: () => [startOfDay(subDays(new Date(), 1)), endOfDay(subDays(new Date(), 1))] },
    { label: 'Last hour', getValue: () => [subHours(new Date(), 1), new Date()] },
    { label: 'Last 24 hours', getValue: () => [subHours(new Date(), 24), new Date()] },
    { label: 'Last 7 days', getValue: () => [subDays(new Date(), 7), new Date()] },
    { label: 'Last 14 days', getValue: () => [subDays(new Date(), 14), new Date()] },
    { label: 'Last 30 days', getValue: () => [subDays(new Date(), 30), new Date()] },
    { label: 'Last 90 days', getValue: () => [subDays(new Date(), 90), new Date()] },
    { label: 'Last 180 days', getValue: () => [subDays(new Date(), 180), new Date()] },
    { label: 'Last week', getValue: () => [startOfWeek(subWeeks(new Date(), 1)), endOfWeek(subWeeks(new Date(), 1))] },
    { label: 'Last month', getValue: () => [startOfMonth(subMonths(new Date(), 1)), endOfMonth(subMonths(new Date(), 1))] },
    { label: 'This month', getValue: () => [startOfMonth(new Date()), endOfDay(new Date())] },
    { label: 'Year to date', getValue: () => [startOfYear(new Date()), new Date()] },
    // All time usually needs a specific start date, using 10 years ago as placeholder or passed prop if needed.
    // implementing as 10 years for now
    { label: 'All time', getValue: () => [subYears(new Date(), 10), new Date()] },
  ];

  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to match initial dates to a preset on mount or update
    // This is optional but nice for persistence if dates are exact matches (mostly for stable presets like 'Yesterday')
    if (startDate && endDate && !selectedLabel) {
      const matchedPreset = presets.find(p => {
        const [start, end] = p.getValue();
        // Check simply for day alignment for stable presets
        return isSameDay(start, startDate) && isSameDay(end, endDate);
      });
      if (matchedPreset) {
        setSelectedLabel(matchedPreset.label);
      }
    }
  }, []); // Run once on mount, or could depend on startDate/endDate if we want to auto-detect provided dates

  const handlePresetSelect = (preset: DatePreset) => {
    const [start, end] = preset.getValue();
    setSelectedLabel(preset.label);
    onChange(start, end);
    setIsOpen(false);
  };

  const applyCustomRange = (amount: number, unit: typeof customUnit) => {
    let start = new Date();
    const end = new Date();

    switch (unit) {
      case 'days': start = subDays(start, amount); break;
      case 'weeks': start = subWeeks(start, amount); break;
      case 'months': start = subMonths(start, amount); break;
      case 'years': start = subYears(start, amount); break;
    }

    setSelectedLabel(`Last ${amount} ${unit.replace('s', '')}${amount > 1 ? 's' : ''}`);
    // Basic singular/plural check, although 'days', 'weeks' etc are already plural in dropdown values. 
    // If unit is 'days', text is 'Last 7 days'. If unit has singular form in logic but plural in UI, handle accordingly.
    // The dropdown values are 'days', 'weeks', 'months', 'years' (plural).
    // So `Last ${amount} ${unit}` works: "Last 7 days", "Last 1 weeks" (needs fix).

    // Better formatting:
    // const unitSingular = unit.slice(0, -1);
    // const unitLabel = amount === 1 ? unitSingular : unit;

    onChange(start, end);
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM d, yyyy');
  };

  const formatRange = () => {
    if (selectedLabel) return selectedLabel;

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    return "Select date range";
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    const dateTime = date.getTime();
    const startTime = startOfDay(startDate).getTime();
    const endTime = endOfDay(endDate).getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };

  const isDateSelected = (date: Date) => {
    if (!startDate || !endDate) return false;
    return isSameDay(date, startDate) || isSameDay(date, endDate);
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);

    if (selectingStart || !startDate) {
      onChange(startOfDay(clickedDate), endOfDay(clickedDate));
      setSelectingStart(false);
    } else {
      if (clickedDate < startDate) {
        onChange(startOfDay(clickedDate), endOfDay(startDate));
      } else {
        onChange(startOfDay(startDate), endOfDay(clickedDate));
      }
      setIsOpen(false);
      setSelectingStart(true);
      setView('menu');
      setSelectedLabel(null); // Clear label when manual range is selected
    }
  };

  const daysInMonth = getDaysInMonth(viewMonth);
  const firstDay = getFirstDayOfMonth(viewMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  const today = new Date();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`appearance-none cursor-pointer font-medium text-sm border border-border rounded-full px-3 py-1 transition-all text-copy flex items-center gap-2 focus:outline-none hover:bg-border/40 ${isOpen ? 'bg-border/60' : 'bg-foreground'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <FontAwesomeIcon icon={faCalendar} className="text-copy-light" />
        <span className="truncate">{formatRange()}</span>
        <FontAwesomeIcon icon={faChevronDown} className={`text-copy-light text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 bg-foreground border border-border rounded-lg shadow-xl z-50 animate-fade-in min-w-[240px] overflow-hidden">

          {view === 'menu' && (
            <div className="flex flex-col py-2 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetSelect(preset)}
                  className="text-left px-4 py-2 text-sm text-copy hover:bg-border/50 transition-colors w-full cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}

              <div className="h-px bg-border my-2 mx-4" />

              <div className="px-4 py-2 flex items-center gap-2">
                <span className="text-sm text-copy">In the last</span>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 0);
                    setCustomAmount(val);
                    applyCustomRange(val, customUnit);
                  }}
                  className="w-10 px-1 py-1 text-xs border border-border rounded bg-transparent focus:outline-none focus:border-primary"
                />
                <select
                  value={customUnit}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setCustomUnit(val);
                    applyCustomRange(customAmount, val);
                  }}
                  className="px-1 py-1 text-xs border border-border rounded bg-transparent focus:outline-none focus:border-primary"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                  <option value="years">years</option>
                </select>
              </div>

              <div className="h-px bg-border my-2 mx-4" />

              <button
                className="text-left px-4 py-2 text-sm text-copy hover:bg-border/50 transition-colors w-full cursor-pointer"
                onClick={() => setView('custom')} // Simplify for now, just go to custom calendar
              >
                From custom date until now...
              </button>
              <button
                className="text-left px-4 py-2 text-sm text-copy hover:bg-border/50 transition-colors w-full cursor-pointer"
                onClick={() => setView('custom')}
              >
                Custom fixed date range...
              </button>
            </div>
          )}

          {view === 'custom' && (
            <div className="p-4 w-[320px]">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setView('menu')}
                  className="text-xs text-copy-light hover:text-copy flex items-center gap-1 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faChevronLeft} /> Back
                </button>
                <span className="text-sm font-semibold">Custom Range</span>
              </div>

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                  className="text-copy-light hover:text-copy transition-colors py-1 px-2 hover:bg-border/50 rounded-md cursor-pointer"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
                </button>
                <span className="text-sm font-semibold text-copy">
                  {format(viewMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                  className="text-copy-light hover:text-copy transition-colors py-1 px-2 hover:bg-border/50 rounded-md cursor-pointer"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-xs text-copy-light text-center font-medium">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {emptyDays.map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}
                {days.map((day) => {
                  const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                  const inRange = isDateInRange(date);
                  const selected = isDateSelected(date);
                  const isPast = date > today;

                  return (
                    <button
                      key={day}
                      onClick={() => !isPast && handleDateClick(day)}
                      disabled={isPast}
                      className={`
                         aspect-square text-xs rounded transition-colors flex items-center justify-center
                         ${isPast ? 'text-copy-lighter cursor-not-allowed' : 'text-copy hover:bg-border/50 cursor-pointer'}
                         ${selected ? 'bg-primary text-primary-content font-bold hover:bg-primary/80 !important' : ''}
                         ${inRange && !selected ? 'bg-primary/10 hover:bg-primary/20' : ''}
                       `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default DateRangePicker;


