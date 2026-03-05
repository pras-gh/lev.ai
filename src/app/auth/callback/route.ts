import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { ensureWorkspaceForUser } from "@/lib/access-layer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_NEXT_PATH = "/dashboard";

function resolveSafeNextPath(requestUrl: URL): string {
  const rawNext = requestUrl.searchParams.get("next")?.trim();
  if (!rawNext) {
    return DEFAULT_NEXT_PATH;
  }

  if (rawNext === "/") {
    return DEFAULT_NEXT_PATH;
  }

  if (rawNext.startsWith("/") && !rawNext.startsWith("//")) {
    return rawNext;
  }

  try {
    const parsed = new URL(rawNext);
    if (parsed.origin === requestUrl.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return DEFAULT_NEXT_PATH;
  }

  return DEFAULT_NEXT_PATH;
}

async function establishSessionFromCallback(request: NextRequest): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const type = (rawType ?? "magiclink") as EmailOtpType;

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }

  if (tokenHash) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });
  }
}

export async function GET(request: NextRequest) {
  const nextPath = resolveSafeNextPath(request.nextUrl);
  const fallbackRedirect = new URL("/", request.url);
  fallbackRedirect.searchParams.set("auth", "failed");

  try {
    await establishSessionFromCallback(request);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.id || !data.user.email) {
      return NextResponse.redirect(fallbackRedirect);
    }

    const bootstrap = await ensureWorkspaceForUser({
      userId: data.user.id,
      email: data.user.email
    });

    const redirectUrl = new URL(nextPath, request.url);
    redirectUrl.searchParams.set("workspaceId", bootstrap.workspaceId);

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.redirect(fallbackRedirect);
  }
}
