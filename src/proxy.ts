import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authSecret =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "trai-dev-auth-secret-change-me";
const PRODUCT_APP_HOST = (process.env.NEXT_PUBLIC_PRODUCT_APP_HOST ?? "app.usetrailai.com").trim().toLowerCase();

function normalizeHost(rawHost: string | null): string {
  if (!rawHost) {
    return "";
  }

  const host = rawHost.split(",")[0]?.trim() ?? "";
  return host.split(":")[0]?.toLowerCase() ?? "";
}

function isProductHostRequest(request: NextRequest): boolean {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const requestHost = normalizeHost(forwardedHost || request.nextUrl.host);
  return requestHost === PRODUCT_APP_HOST;
}

function isProtectedProductPath(pathname: string): boolean {
  return pathname.startsWith("/app") || pathname === "/dashboard";
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  for (const cookie of request.cookies.getAll()) {
    const name = cookie.name.toLowerCase();
    if (name === "sb-access-token" || name === "supabase-access-token") {
      return true;
    }

    if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
      return true;
    }
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const productHostRequest = isProductHostRequest(request);
  const token = await getToken({ req: request, secret: authSecret });
  const hasAuthSession = Boolean(token) || hasSupabaseAuthCookie(request);

  if (productHostRequest && pathname === "/") {
    if (hasAuthSession) {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (productHostRequest && pathname === "/login" && hasAuthSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (!isProtectedProductPath(pathname)) {
    return NextResponse.next();
  }

  if (hasAuthSession) {
    return NextResponse.next();
  }

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("next", nextPath);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/", "/app/:path*", "/dashboard", "/login"],
};
