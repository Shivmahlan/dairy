import { cn } from "@/features/dairy/lib/cn";

interface SummaryCardProps {
  title: string;
  value: string;
  detail: string;
  accent?: "default" | "primary";
}

export function SummaryCard({
  title,
  value,
  detail,
  accent = "default",
}: SummaryCardProps) {
  return (
    <article
      className={cn(
        "rounded-3xl border p-5 shadow-[0_20px_45px_-34px_rgba(35,49,39,0.45)]",
        accent === "primary"
          ? "border-primary/20 bg-primary/8"
          : "border-border/80 bg-white/80",
      )}
    >
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}
