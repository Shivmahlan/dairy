import { type SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_MILK_RATE } from "./constants";
import type { BusinessContext, BusinessRole } from "./types";

interface BusinessMembershipRow {
  business_id: string;
  role: BusinessRole;
  business: {
    id: string;
    name: string;
    milk_rate: number | string | null;
  } | null;
}

function normalizeMilkRate(value: unknown) {
  const parsedValue = Number(value ?? DEFAULT_MILK_RATE);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return DEFAULT_MILK_RATE;
  }

  return parsedValue;
}

function normalizeMembership(
  userId: string,
  userEmail: string,
  row: BusinessMembershipRow,
): BusinessContext {
  return {
    userId,
    userEmail,
    businessId: row.business_id,
    businessName: row.business?.name ?? "Assigned business",
    milkRate: normalizeMilkRate(row.business?.milk_rate),
    role: row.role ?? "member",
  };
}

export async function fetchBusinessContext(
  supabase: SupabaseClient,
): Promise<BusinessContext | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("business_members")
    .select("business_id, role, business:businesses(id, name, milk_rate)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return normalizeMembership(
    user.id,
    user.email ?? "No email",
    data as unknown as BusinessMembershipRow,
  );
}

export async function requireBusinessContext(supabase: SupabaseClient) {
  const businessContext = await fetchBusinessContext(supabase);

  if (!businessContext) {
    throw new Error(
      "No business access has been assigned to this user yet. Add a business_members row in Supabase for this account.",
    );
  }

  return businessContext;
}

export async function updateBusinessMilkRate(
  supabase: SupabaseClient,
  businessId: string,
  milkRate: number,
) {
  if (!Number.isFinite(milkRate) || milkRate < 0) {
    throw new Error("Milk rate must be a valid non-negative number.");
  }

  const { data, error } = await supabase
    .from("businesses")
    .update({ milk_rate: milkRate })
    .eq("id", businessId)
    .select("milk_rate")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMilkRate((data as { milk_rate?: unknown } | null)?.milk_rate);
}
