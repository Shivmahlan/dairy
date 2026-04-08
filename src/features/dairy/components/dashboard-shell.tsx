import type { BusinessContext } from "@/features/dairy/lib/types";

import { BusinessContextProvider } from "./business-context-provider";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
  businessContext: BusinessContext | null;
}

export function DashboardShell({
  children,
  userEmail,
  businessContext,
}: DashboardShellProps) {
  const content = businessContext ? (
    <BusinessContextProvider value={businessContext}>
      {children}
    </BusinessContextProvider>
  ) : (
    children
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
      <DashboardSidebar
        userEmail={userEmail}
        businessName={businessContext?.businessName ?? "No business assigned"}
      />
      <main className="flex-1 space-y-6 pb-8">{content}</main>
    </div>
  );
}
