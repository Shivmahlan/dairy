import { redirect } from "next/navigation";

import { DashboardShell } from "@/features/dairy/components/dashboard-shell";
import { fetchBusinessContext } from "@/features/dairy/lib/business";
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

  const businessContext = await fetchBusinessContext(supabase);

  return (
    <DashboardShell
      userEmail={user.email ?? "No email"}
      businessContext={businessContext}
    >
      {businessContext ? (
        children
      ) : (
        <section className="rounded-[2rem] border border-warning/20 bg-warning/10 p-8 text-warning shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em]">
            Business Access Required
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            This user is not assigned to any dairy business yet.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Keep signup disabled, then add this user manually in Supabase Auth and
            create a matching row in `public.business_members` linked to a
            `public.businesses` record. Once assigned, refresh this page and the
            dashboard will load normally.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}
