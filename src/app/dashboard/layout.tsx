import { redirect } from "next/navigation";

import { DashboardShell } from "@/features/dairy/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell userEmail={user.email ?? "Single user"}>
      {children}
    </DashboardShell>
  );
}
