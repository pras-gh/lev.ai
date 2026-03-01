import { getSupabaseAuthEnv } from "@/lib/supabase/env";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export function getSupabaseConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  return getSupabaseAuthEnv();
}

export async function fetchSupabaseUserByAccessToken(
  accessToken: string
): Promise<SupabaseAuthUser> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("Invalid or expired Supabase session");
  }

  if (!response.ok) {
    throw new Error("Failed to validate Supabase session");
  }

  const payload = (await response.json()) as { id?: unknown; email?: unknown };
  if (typeof payload.id !== "string" || payload.id.trim().length === 0) {
    throw new Error("Supabase user payload missing id");
  }

  return {
    id: payload.id.trim(),
    email: typeof payload.email === "string" ? payload.email : undefined
  };
}
