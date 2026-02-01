import { cn } from "@/lib/utils";

export type ExperimentStatus = "draft" | "pending" | "active" | "paused" | "completed" | "archived" | "failed";

const statusConfig: Record<ExperimentStatus, { bg: string; text: string; label: string }> = {
  draft: { 
    bg: "bg-zinc-100 dark:bg-zinc-800", 
    text: "text-zinc-700 dark:text-zinc-300", 
    label: "Draft" 
  },
  pending: { 
    bg: "bg-yellow-100 dark:bg-yellow-900/30", 
    text: "text-yellow-700 dark:text-yellow-400", 
    label: "Pending" 
  },
  active: { 
    bg: "bg-green-100 dark:bg-green-900/30", 
    text: "text-green-700 dark:text-green-400", 
    label: "Active" 
  },
  paused: { 
    bg: "bg-orange-100 dark:bg-orange-900/30", 
    text: "text-orange-700 dark:text-orange-400", 
    label: "Paused" 
  },
  completed: { 
    bg: "bg-blue-100 dark:bg-blue-900/30", 
    text: "text-blue-700 dark:text-blue-400", 
    label: "Completed" 
  },
  archived: { 
    bg: "bg-zinc-100 dark:bg-zinc-800", 
    text: "text-zinc-500 dark:text-zinc-400", 
    label: "Archived" 
  },
  failed: { 
    bg: "bg-red-100 dark:bg-red-900/30", 
    text: "text-red-700 dark:text-red-400", 
    label: "Failed" 
  }
};

interface StatusBadgeProps {
  status: ExperimentStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as ExperimentStatus] || {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    label: status
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        config.bg,
        config.text,
        className
      )}
      role="status"
    >
      {config.label}
    </span>
  );
}

interface ActiveStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function ActiveStatusBadge({ isActive, className }: ActiveStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        isActive 
          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
        className
      )}
      role="status"
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
