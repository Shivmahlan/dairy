import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
}

export function DashboardShell({ children, userEmail }: DashboardShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
      <DashboardSidebar userEmail={userEmail} />
      <main className="flex-1 space-y-6 pb-8">{children}</main>
    </div>
  );
}
