"use server";

import { redirect } from "next/navigation";

import { DASHBOARD_HOME } from "@/features/dairy/lib/constants";
import type { LoginFormState } from "@/features/dairy/lib/types";
import { createClient } from "@/lib/supabase/server";

const INITIAL_STATE: LoginFormState = {
  error: null,
};

export async function login(
  _previousState: LoginFormState = INITIAL_STATE,
  formData: FormData,
): Promise<LoginFormState> {
  void _previousState;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email and password are required.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: error.message || "Unable to sign in with those credentials.",
    };
  }

  redirect(DASHBOARD_HOME);
}
