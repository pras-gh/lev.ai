import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authSecret =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "trai-dev-auth-secret-change-me";

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
  const token = await getToken({ req: request, secret: authSecret });

  if (token) {
    const planStatus = typeof token.planStatus === "string" ? token.planStatus : token.isPaid ? "active" : "trial";
    if (planStatus === "active") {
      return NextResponse.next();
    }

    const privateAccessRedirect = new URL("/private-access", request.url);
    privateAccessRedirect.searchParams.set("plan_status", planStatus);
    return clearAuthCookies(NextResponse.redirect(privateAccessRedirect));
  }

  const redirectUrl = new URL("/", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  redirectUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/app/:path*", "/dashboard"],
};
