import NextAuth from "next-auth";
import { authOptions, getMissingAuthEnvKeys } from "@/lib/auth/options";

export const dynamic = "force-dynamic";

const missingAuthEnvKeys = getMissingAuthEnvKeys();
const handler = missingAuthEnvKeys.length === 0 ? NextAuth(authOptions) : null;

function missingEnvResponse() {
  return Response.json(
    {
      error: "Auth configuration is incomplete.",
      missing: missingAuthEnvKeys,
    },
    { status: 500 }
  );
}

export async function GET(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!handler) {
    return missingEnvResponse();
  }

  return handler(request as never, context as never);
}

export async function POST(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!handler) {
    return missingEnvResponse();
  }

  return handler(request as never, context as never);
}
