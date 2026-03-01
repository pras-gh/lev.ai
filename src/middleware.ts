import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authSecret =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "trai-dev-auth-secret-change-me";
const PRODUCT_APP_HOST = (process.env.NEXT_PUBLIC_PRODUCT_APP_HOST ?? "app.usetrailai.com").trim().toLowerCase();
const MARKETING_SITE_ORIGIN = (process.env.NEXT_PUBLIC_MARKETING_SITE_ORIGIN ?? "https://usetrailai.com").trim();

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

function buildMarketingRedirect(nextTarget: string): URL {
  const marketingUrl = new URL(MARKETING_SITE_ORIGIN);
  marketingUrl.searchParams.set("next", nextTarget);
  return marketingUrl;
}

function clearAuthCookies(response: NextResponse) {
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "__Secure-next-auth.csrf-token",
  ];

  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const productHostRequest = isProductHostRequest(request);
  const token = await getToken({ req: request, secret: authSecret });
  const planStatus = typeof token?.planStatus === "string" ? token.planStatus : token?.isPaid ? "active" : "trial";

  if (productHostRequest && pathname === "/") {
    if (planStatus === "active") {
      return NextResponse.redirect(new URL("/app", request.url));
    }

    const nextTarget = `https://${PRODUCT_APP_HOST}/app`;
    return NextResponse.redirect(buildMarketingRedirect(nextTarget));
  }

  if (!isProtectedProductPath(pathname)) {
    return NextResponse.next();
  }

  if (token) {
    if (planStatus === "active") {
      return NextResponse.next();
    }

    const privateAccessRedirect = productHostRequest
      ? new URL(`/private-access?plan_status=${encodeURIComponent(planStatus)}`, MARKETING_SITE_ORIGIN)
      : new URL("/private-access", request.url);

    if (!productHostRequest) {
      privateAccessRedirect.searchParams.set("plan_status", planStatus);
    }
    return clearAuthCookies(NextResponse.redirect(privateAccessRedirect));
  }

  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = productHostRequest
    ? buildMarketingRedirect(`https://${PRODUCT_APP_HOST}${nextPath}`)
    : new URL("/", request.url);

  if (!productHostRequest) {
    redirectUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/", "/app/:path*", "/dashboard"],
};
