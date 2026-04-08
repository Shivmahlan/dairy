import { redirect } from "next/navigation";

import { DASHBOARD_HOME } from "@/features/dairy/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? DASHBOARD_HOME : "/login");
}
