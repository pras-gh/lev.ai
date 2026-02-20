import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type AuthEnv = {
  googleClientId: string;
  googleClientSecret: string;
  nextAuthSecret: string;
};

type EnvKey = "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "NEXTAUTH_SECRET";

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function resolveAuthEnv():
  | {
      ok: true;
      values: AuthEnv;
    }
  | {
      ok: false;
      missing: EnvKey[];
    } {
  const googleClientId =
    readEnv("GOOGLE_CLIENT_ID") || readEnv("AUTH_GOOGLE_ID") || readEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET") || readEnv("AUTH_GOOGLE_SECRET");
  const nextAuthSecret = readEnv("NEXTAUTH_SECRET") || readEnv("AUTH_SECRET");

  const missing: EnvKey[] = [];
  if (!googleClientId) {
    missing.push("GOOGLE_CLIENT_ID");
  }
  if (!googleClientSecret) {
    missing.push("GOOGLE_CLIENT_SECRET");
  }
  if (!nextAuthSecret) {
    missing.push("NEXTAUTH_SECRET");
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    values: {
      googleClientId,
      googleClientSecret,
      nextAuthSecret,
    },
  };
}

function getHandler() {
  const authEnv = resolveAuthEnv();
  if (!authEnv.ok) {
    return null;
  }

  return NextAuth({
    providers: [
      GoogleProvider({
        clientId: authEnv.values.googleClientId,
        clientSecret: authEnv.values.googleClientSecret,
      }),
    ],
    secret: authEnv.values.nextAuthSecret,
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
  const authEnv = resolveAuthEnv();
  const missingKeys = authEnv.ok ? [] : authEnv.missing;

  return Response.json(
    {
      error: "Missing NextAuth env vars.",
      missing: missingKeys,
      required: ["NEXTAUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
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
