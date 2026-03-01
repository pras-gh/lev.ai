type SupabasePublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type SupabaseAuthEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function isValidSupabaseUrl(value: string | undefined) {
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

function normalizeEnv(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasSupabasePublicEnv() {
  return isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!isValidSupabaseUrl(supabaseUrl) || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

export function hasSupabaseAuthEnv() {
  const supabaseUrl =
    normalizeEnv(process.env.SUPABASE_URL) ??
    normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey =
    normalizeEnv(process.env.SUPABASE_ANON_KEY) ??
    normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return isValidSupabaseUrl(supabaseUrl ?? undefined) && Boolean(supabaseAnonKey);
}

export function getSupabaseAuthEnv(): SupabaseAuthEnv {
  const supabaseUrl =
    normalizeEnv(process.env.SUPABASE_URL) ??
    normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey =
    normalizeEnv(process.env.SUPABASE_ANON_KEY) ??
    normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !isValidSupabaseUrl(supabaseUrl) || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    supabaseAnonKey
  };
}
