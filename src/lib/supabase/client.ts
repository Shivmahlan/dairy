import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseCredentials } from "./env";

export function createClient() {
  const { url, publishableKey } = getSupabaseCredentials();

  return createBrowserClient(url, publishableKey);
}
