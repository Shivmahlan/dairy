"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/features/dairy/lib/cn";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
