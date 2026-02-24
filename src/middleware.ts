import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authSecret =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "trai-dev-auth-secret-change-me";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: authSecret });

  if (token) {
    const planStatus = typeof token.planStatus === "string" ? token.planStatus : token.isPaid ? "active" : "trial";
    if (planStatus === "active") {
      return NextResponse.next();
    }

    const billingRedirect = new URL("/billing", request.url);
    billingRedirect.searchParams.set("plan_status", planStatus);
    return NextResponse.redirect(billingRedirect);
  }

  const redirectUrl = new URL("/", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  redirectUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/app/:path*", "/dashboard"],
};
