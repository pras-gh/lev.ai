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

export function hasSupabaseAdminEnv() {
  return Boolean(isValidUrl(process.env.SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseAdminEnv(): SupabaseAdminEnv {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!isValidUrl(supabaseUrl) || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
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
