"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setIsPending(true);
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message || "Unable to sign out right now.");
      setIsPending(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/6 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Signing out..." : "Log Out"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
