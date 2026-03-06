"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return null;
  }

  return browserClient;
}
