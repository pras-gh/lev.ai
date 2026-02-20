import { NextResponse } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: "Supabase environment variables are missing.",
      },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] =
    await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  if (sessionError || userError) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: sessionError?.message ?? userError?.message ?? "Unable to verify session.",
      },
      { status: 401 }
    );
  }

  if (!sessionData.session || !userData.user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      expiresAt: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: userData.user.id,
      email: userData.user.email ?? null,
    },
    expiresAt: sessionData.session.expires_at ?? null,
  });
}
