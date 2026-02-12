import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Browser/client-side Supabase instance — only created when NEXT_PUBLIC_* envs are present.
// This prevents server-side module evaluation from throwing when only server keys exist.
const _hasValidPublicKeys =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("http") &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("REPLACE_ME");

export const supabase = _hasValidPublicKeys
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  : null;

// Server-only Supabase admin/client instance
// IMPORTANT: This must only be used in server-side code (API routes, server actions, etc.).
// Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or include it in client bundles.
export function getAdminSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  // persistSession=false to avoid setting cookies or client-side session persistence
  return createClient(url, key, { auth: { persistSession: false } });
}
