import { createClient } from "@supabase/supabase-js";

type SupabaseAdminEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

function isValidUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function resolveSupabaseUrl() {
  return (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
}

function resolveServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "").trim();
}

export function getMissingSupabaseAdminEnvKeys() {
  const missing: string[] = [];

  if (!isValidUrl(resolveSupabaseUrl())) {
    missing.push("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  }

  if (!resolveServiceRoleKey()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)");
  }

  return missing;
}

export function hasSupabaseAdminEnv() {
  return getMissingSupabaseAdminEnvKeys().length === 0;
}

function getSupabaseAdminEnv(): SupabaseAdminEnv {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceRoleKey = resolveServiceRoleKey();

  if (!isValidUrl(supabaseUrl) || !serviceRoleKey) {
    throw new Error(
      `Missing Supabase admin env vars: ${getMissingSupabaseAdminEnvKeys().join(", ")}.`
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

export function createSupabaseAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminEnv();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
