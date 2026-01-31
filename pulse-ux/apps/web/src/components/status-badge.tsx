import { cn } from "@/lib/utils";

export type ExperimentStatus = "draft" | "pending" | "active" | "paused" | "completed" | "archived";

const statusConfig: Record<ExperimentStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-zinc-100", text: "text-zinc-700", label: "Draft" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  paused: { bg: "bg-orange-100", text: "text-orange-700", label: "Paused" },
  completed: { bg: "bg-blue-100", text: "text-blue-700", label: "Completed" },
  archived: { bg: "bg-zinc-100", text: "text-zinc-500", label: "Archived" }
};

interface StatusBadgeProps {
  status: ExperimentStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as ExperimentStatus] || {
    bg: "bg-zinc-100",
    text: "text-zinc-700",
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
        isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500",
        className
      )}
      role="status"
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
