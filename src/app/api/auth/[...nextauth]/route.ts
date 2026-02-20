import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextRequest } from "next/server";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

function getHandler() {
  if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
    return null;
  }

  return NextAuth({
    providers: [
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    ],
    secret: nextAuthSecret,
    session: {
      strategy: "jwt",
    },
  });
}

type NextAuthContext = {
  params: Promise<{
    nextauth: string[];
  }>;
};

function missingEnvResponse() {
  return Response.json(
    {
      error:
        "Missing NextAuth env vars. Required: NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.",
    },
    { status: 500 }
  );
}

export async function GET(request: NextRequest, context: NextAuthContext) {
  const handler = getHandler();
  if (!handler) {
    return missingEnvResponse();
  }

  return handler(request, context as never);
}

export async function POST(request: NextRequest, context: NextAuthContext) {
  const handler = getHandler();
  if (!handler) {
    return missingEnvResponse();
  }

  return handler(request, context as never);
}
