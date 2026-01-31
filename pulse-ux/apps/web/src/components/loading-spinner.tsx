import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8"
};

export function LoadingSpinner({ size = "md", className, label = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = "Loading..." }: FullPageLoadingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoading({ loading, children, loadingText = "Loading..." }: ButtonLoadingProps) {
  if (loading) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{loadingText}</span>
      </>
    );
  }
  return <>{children}</>;
}
