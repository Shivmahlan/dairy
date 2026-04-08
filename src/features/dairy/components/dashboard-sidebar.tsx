"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, Droplets, FolderKanban, Leaf } from "lucide-react";

import { cn } from "@/features/dairy/lib/cn";

import { LogoutButton } from "./logout-button";

const items = [
  {
    href: "/dashboard/milk-collection",
    label: "Milk Collection",
    icon: Droplets,
  },
  {
    href: "/dashboard/records",
    label: "Records",
    icon: FolderKanban,
  },
  {
    href: "/dashboard/ledger",
    label: "Ledger",
    icon: BookText,
  },
];

interface DashboardSidebarProps {
  userEmail: string;
}

export function DashboardSidebar({ userEmail }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[300px]">
      <div className="flex h-full flex-col rounded-[2rem] border border-border/80 bg-white/80 p-5 shadow-[0_26px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur">
        <div className="flex items-center gap-4 rounded-3xl border border-primary/10 bg-primary/8 p-4">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
              Dairy App
            </p>
            <h1 className="text-lg font-semibold text-foreground">
              Daily operations
            </h1>
          </div>
        </div>

        <nav className="mt-6 grid gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface hover:border-primary/30 hover:bg-primary/6",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-3xl border border-border/80 bg-surface p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Signed in as
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">
              {userEmail}
            </p>
          </div>
          <p className="text-sm leading-6 text-muted">
            Keep milk entries and financial records in sync with one secure login.
          </p>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
