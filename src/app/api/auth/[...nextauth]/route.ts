import NextAuth from "next-auth";
import { authOptions, getMissingAuthEnvKeys } from "@/lib/auth/options";

export const dynamic = "force-dynamic";

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function ensureRuntimeAuthUrl(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const configuredAuthUrl = process.env.NEXTAUTH_URL?.trim();

  if (!isValidHttpUrl(configuredAuthUrl)) {
    process.env.NEXTAUTH_URL = requestOrigin;
    return;
  }

  try {
    const configuredHost = new URL(configuredAuthUrl).host;
    const requestHost = new URL(request.url).host;
    if (configuredHost !== requestHost) {
      process.env.NEXTAUTH_URL = requestOrigin;
    }
  } catch {
    process.env.NEXTAUTH_URL = requestOrigin;
  }
}

function missingEnvResponse(missingAuthEnvKeys: string[]) {
  return Response.json(
    {
      error: "Auth configuration is incomplete.",
      missing: missingAuthEnvKeys,
    },
    { status: 500 }
  );
}

export async function GET(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  ensureRuntimeAuthUrl(request);
  const missingAuthEnvKeys = getMissingAuthEnvKeys();
  const handler = missingAuthEnvKeys.length === 0 ? NextAuth(authOptions) : null;

  if (!handler) {
    return missingEnvResponse(missingAuthEnvKeys);
  }

  return handler(request as never, context as never);
}

export async function POST(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  ensureRuntimeAuthUrl(request);
  const missingAuthEnvKeys = getMissingAuthEnvKeys();
  const handler = missingAuthEnvKeys.length === 0 ? NextAuth(authOptions) : null;

  if (!handler) {
    return missingEnvResponse(missingAuthEnvKeys);
  }

  return handler(request as never, context as never);
}
