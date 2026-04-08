"use client";

import { useActionState } from "react";
import { LockKeyhole, Mail } from "lucide-react";

import { login } from "@/app/login/actions";
import { SubmitButton } from "@/features/dairy/components/submit-button";

const initialState = {
  error: null,
};

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">
          Account Access
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Log in
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Use the email and password from your Supabase Auth user. Sign-up stays
          disabled in the app so access stays simple.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Email</span>
          <span className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-white px-4">
            <Mail className="h-4 w-4 text-muted" />
            <input
              required
              type="email"
              name="email"
              placeholder="owner@example.com"
              autoComplete="email"
              className="h-full w-full bg-transparent text-sm placeholder:text-muted/70"
            />
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Password</span>
          <span className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-white px-4">
            <LockKeyhole className="h-4 w-4 text-muted" />
            <input
              required
              type="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              className="h-full w-full bg-transparent text-sm placeholder:text-muted/70"
            />
          </span>
        </label>

        {state.error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </div>
        ) : null}

        <SubmitButton pendingLabel="Signing in..." className="w-full">
          Sign In
        </SubmitButton>
      </form>
    </div>
  );
}
