import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import {
  createSupabaseAdminClient,
  hasSupabaseAdminEnv,
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
});

function parseErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const record = error as Record<string, unknown>;
  return typeof record.message === "string" && record.message.trim()
    ? record.message.trim()
    : fallback;
}

function resolveSupabasePublicAuthEnv() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "").trim();

  const missing: string[] = [];

  if (!supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  }

  if (!supabaseAnonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)");
  }

  if (missing.length > 0) {
    return { missing, config: null };
  }

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        missing: ["NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) must be a valid URL"],
        config: null,
      };
    }
  } catch {
    return {
      missing: ["NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) must be a valid URL"],
      config: null,
    };
  }

  return {
    missing,
    config: { supabaseUrl, supabaseAnonKey },
  };
}

export async function POST(request: Request) {
  const { missing, config } = resolveSupabasePublicAuthEnv();
  if (!config) {
    return NextResponse.json(
      {
        error: "Sign up is not configured.",
        missing,
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json({ error: firstIssue?.message ?? "Invalid signup payload." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();
  const password = parsed.data.password;

  try {
    const supabaseAuthClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAuthClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      const errorText = parseErrorMessage(error, "Unable to create account right now.");
      const normalized = errorText.toLowerCase();
      if (
        normalized.includes("already registered") ||
        normalized.includes("already exists") ||
        normalized.includes("user exists")
      ) {
        return NextResponse.json({ error: "This email is already registered. Please log in." }, { status: 409 });
      }

      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    // Optional compatibility write for legacy credential table.
    if (hasSupabaseAdminEnv()) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();
        await supabaseAdmin.from("dashboard_users").upsert(
          {
            email,
            full_name: name,
            password: hashPassword(password),
            is_paid: true,
          },
          {
            onConflict: "email",
          }
        );
      } catch {
        // Non-fatal: Supabase Auth signup already succeeded.
      }
    }

    return NextResponse.json({
      ok: true,
      requiresEmailConfirmation: !data.session,
      user: {
        id: data.user?.id ?? null,
        email: data.user?.email ?? email,
        name:
          typeof data.user?.user_metadata?.full_name === "string" &&
          data.user.user_metadata.full_name.trim()
            ? data.user.user_metadata.full_name.trim()
            : name,
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: parseErrorMessage(error, "Sign up failed. Please try again.") },
      { status: 500 }
    );
  }
}
