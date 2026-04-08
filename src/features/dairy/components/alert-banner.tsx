import { cn } from "@/features/dairy/lib/cn";
import type { AlertState } from "@/features/dairy/lib/types";

interface AlertBannerProps {
  alert: AlertState | null;
}

export function AlertBanner({ alert }: AlertBannerProps) {
  if (!alert) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        alert.tone === "success"
          ? "border-primary/20 bg-primary/10 text-primary-strong"
          : alert.tone === "warning"
            ? "border-warning/20 bg-warning/10 text-warning"
          : "border-danger/20 bg-danger/10 text-danger",
      )}
    >
      {alert.message}
    </div>
  );
}
