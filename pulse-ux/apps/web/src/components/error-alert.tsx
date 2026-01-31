import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  error: Error | string | null | undefined;
  title?: string;
  className?: string;
  fallbackMessage?: string;
}

export function ErrorAlert({
  error,
  title = "Error",
  className,
  fallbackMessage = "An unexpected error occurred. Please try again."
}: ErrorAlertProps) {
  if (!error) return null;

  const message = error instanceof Error ? error.message : error || fallbackMessage;

  return (
    <Alert variant="destructive" className={cn(className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

interface FormErrorProps {
  error: Error | string | null | undefined;
  className?: string;
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null;

  const message = error instanceof Error ? error.message : error;

  return (
    <div className={cn("rounded-md bg-destructive/10 p-4", className)} role="alert">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
