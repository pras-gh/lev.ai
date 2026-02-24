export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

function normalizeEnv(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getSupabaseConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const supabaseUrl =
    normalizeEnv(process.env.SUPABASE_URL) ??
    normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey =
    normalizeEnv(process.env.SUPABASE_ANON_KEY) ??
    normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    supabaseAnonKey
  };
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
