import { redirect } from "next/navigation";
import { Leaf, ShieldCheck, Wallet } from "lucide-react";

import { LoginForm } from "@/features/dairy/components/login-form";
import { APP_NAME, DASHBOARD_HOME } from "@/features/dairy/lib/constants";
import { createClient } from "@/lib/supabase/server";

const quickPoints = [
  {
    icon: Leaf,
    title: "Milk tracking",
    description: "Capture morning and evening milk entries with live total calculation.",
  },
  {
    icon: Wallet,
    title: "Clean records",
    description: "Review earnings, credits, debits, and the remaining balance in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Single-user access",
    description: "Use one Supabase email/password login with protected routes across the app.",
  },
];

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(DASHBOARD_HOME);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-border/80 bg-white/70 p-8 shadow-[0_26px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur md:p-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white">
              <Leaf className="h-4 w-4" />
            </span>
            {APP_NAME}
          </div>

          <div className="mt-6 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">
              Secure Login
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              A simple dairy dashboard built for daily collection and records.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
              Sign in with the single Supabase user account to manage milk entries,
              transactions, summaries, and exports without extra setup screens.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {quickPoints.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-3xl border border-border/80 bg-surface/80 p-5"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/70 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/80 bg-surface/90 p-6 shadow-[0_26px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-8">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
