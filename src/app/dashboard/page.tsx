import { redirect } from "next/navigation";

import { DASHBOARD_HOME } from "@/features/dairy/lib/constants";

export default function DashboardPage() {
  redirect(DASHBOARD_HOME);
}
