import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

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

export async function POST(request: Request) {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { error: "Sign up is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
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
  const passwordHash = hashPassword(parsed.data.password);
  const supabase = createSupabaseAdminClient();

  try {
    const { data: existingUser, error: existingError } = await supabase
      .from("dashboard_users")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: parseErrorMessage(existingError, "Unable to verify existing account.") },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json({ error: "This email is already registered. Please log in." }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("dashboard_users")
      .insert({
        email,
        full_name: name,
        password: passwordHash,
        is_paid: true,
      })
      .select("id,email,full_name,is_paid")
      .single();

    if (error) {
      return NextResponse.json(
        { error: parseErrorMessage(error, "Unable to create account right now.") },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: data.id,
          email: data.email,
          name: data.full_name,
          isPaid: Boolean(data.is_paid),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: parseErrorMessage(error, "Sign up failed. Please try again.") },
      { status: 500 }
    );
  }
}
