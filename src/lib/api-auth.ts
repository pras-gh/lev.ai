import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { getToken } from "next-auth/jwt";
import type { PoolClient } from "pg";
import type { ApiScopeInput, ResolvedScope } from "@/lib/api-utils";
import { resolveScope } from "@/lib/api-utils";
import { getDbPool } from "@/lib/db";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

type SupabaseUserResponse = {
  id?: unknown;
  email?: unknown;
};

type WorkspaceMemberRow = {
  role: string;
  status: string;
};

type SessionUser = {
  userId: string;
  email: string | null;
};

const nextAuthSecret =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "trai-dev-auth-secret-change-me";

export type AuthorizedScope = ResolvedScope & {
  userId: string;
  workspaceRole: string;
};

export class ApiAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

function authError(message: string, status: number): never {
  throw new ApiAuthError(message, status);
}

function parseEnvString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveSupabaseAuthConfig(): { supabaseUrl: string; supabaseAnonKey: string } {
  const supabaseUrl =
    parseEnvString(process.env.SUPABASE_URL) ??
    parseEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey =
    parseEnvString(process.env.SUPABASE_ANON_KEY) ??
    parseEnvString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    authError(
      "Missing Supabase auth config. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      500
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    supabaseAnonKey
  };
}

function looksLikeJwt(value: string): boolean {
  return JWT_REGEX.test(value.trim());
}

function deterministicUuidFromSeed(seed: string): string {
  const digest = createHash("sha256").update(seed).digest("hex");
  const part1 = digest.slice(0, 8);
  const part2 = digest.slice(8, 12);
  const part3Raw = parseInt(digest.slice(12, 16), 16);
  const part4Raw = parseInt(digest.slice(16, 20), 16);
  const part3 = ((part3Raw & 0x0fff) | 0x4000).toString(16).padStart(4, "0");
  const part4 = ((part4Raw & 0x3fff) | 0x8000).toString(16).padStart(4, "0");
  const part5 = digest.slice(20, 32);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

function normalizeSessionUserId(candidateId: string | null, email: string | null): string {
  if (candidateId && UUID_REGEX.test(candidateId)) {
    return candidateId;
  }

  const seed = candidateId || email || "trail-anon-session";
  return deterministicUuidFromSeed(seed);
}

async function validateNextAuthSession(request: NextRequest): Promise<SessionUser | null> {
  const token = await getToken({
    req: request,
    secret: nextAuthSecret,
  });

  if (!token) {
    return null;
  }

  const email =
    typeof token.email === "string" && token.email.trim() ? token.email.trim().toLowerCase() : null;
  const candidateId =
    typeof token.id === "string" && token.id.trim()
      ? token.id.trim()
      : typeof token.sub === "string" && token.sub.trim()
        ? token.sub.trim()
        : null;

  return {
    userId: normalizeSessionUserId(candidateId, email),
    email,
  };
}

function parseTokenFromUnknown(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const token = value.trim();
    return looksLikeJwt(token) ? token : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const token = parseTokenFromUnknown(entry);
      if (token) {
        return token;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct =
      parseTokenFromUnknown(record.access_token) ??
      parseTokenFromUnknown(record.accessToken) ??
      parseTokenFromUnknown(record.token);
    if (direct) {
      return direct;
    }

    return (
      parseTokenFromUnknown(record.session) ??
      parseTokenFromUnknown(record.currentSession) ??
      parseTokenFromUnknown(record.data)
    );
  }

  return null;
}

function tryParseTokenPayload(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  if (looksLikeJwt(trimmed)) {
    return trimmed;
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed && looksLikeJwt(decoded)) {
      return decoded;
    }

    const parsedDecoded = JSON.parse(decoded) as unknown;
    const tokenFromDecoded = parseTokenFromUnknown(parsedDecoded);
    if (tokenFromDecoded) {
      return tokenFromDecoded;
    }
  } catch {
    // ignore
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parseTokenFromUnknown(parsed);
  } catch {
    return null;
  }
}

function extractAccessToken(request: NextRequest): string {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const [scheme, token] = authorization.split(/\s+/, 2);
    if (scheme?.toLowerCase() === "bearer" && token && looksLikeJwt(token)) {
      return token;
    }
  }

  const headerCandidates = [
    request.headers.get("x-supabase-access-token"),
    request.headers.get("x-access-token")
  ];
  for (const candidate of headerCandidates) {
    if (!candidate) {
      continue;
    }

    const token = tryParseTokenPayload(candidate);
    if (token) {
      return token;
    }
  }

  const cookieCandidates = request.cookies.getAll();
  for (const cookie of cookieCandidates) {
    const name = cookie.name.toLowerCase();
    const isKnownAuthCookie =
      name === "sb-access-token" ||
      name === "supabase-access-token" ||
      (name.startsWith("sb-") && name.endsWith("-auth-token"));

    if (!isKnownAuthCookie) {
      continue;
    }

    const token = tryParseTokenPayload(cookie.value);
    if (token) {
      return token;
    }
  }

  authError("Missing access token. Send Authorization: Bearer <token>.", 401);
}

async function validateSupabaseSession(request: NextRequest): Promise<SessionUser> {
  const accessToken = extractAccessToken(request);
  const { supabaseUrl, supabaseAnonKey } = resolveSupabaseAuthConfig();

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });
  } catch {
    authError("Unable to reach auth provider for session validation.", 502);
  }

  if (response.status === 401 || response.status === 403) {
    authError("Invalid or expired session token.", 401);
  }

  if (!response.ok) {
    authError("Session validation failed at auth provider.", 502);
  }

  const payload = (await response.json()) as SupabaseUserResponse;
  const userId = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!UUID_REGEX.test(userId)) {
    authError("Session missing valid user id.", 401);
  }

  return {
    userId,
    email: typeof payload.email === "string" ? payload.email : null
  };
}

async function requireActiveWorkspaceMembership(params: {
  workspaceId: string;
  userId: string;
  client?: PoolClient;
}): Promise<{ role: string }> {
  const db = params.client ?? getDbPool();
  const result = await db.query<WorkspaceMemberRow>(
    `
    SELECT role, status
    FROM workspace_members
    WHERE workspace_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,
    [params.workspaceId, params.userId]
  );

  const membership = result.rows[0];
  if (!membership) {
    authError("Forbidden: user does not belong to this workspace.", 403);
  }

  if ((membership.status ?? "").toLowerCase() !== "active") {
    authError("Forbidden: workspace membership is not active.", 403);
  }

  return { role: membership.role };
}

export function getAuthErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiAuthError) {
    return error.status;
  }

  return undefined;
}

export async function resolveSessionUser(request: NextRequest): Promise<{
  userId: string;
  email: string | null;
}> {
  try {
    return await validateSupabaseSession(request);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus && authStatus !== 401 && authStatus !== 403) {
      throw error;
    }
  }

  const nextAuthSession = await validateNextAuthSession(request);
  if (nextAuthSession) {
    return nextAuthSession;
  }

  authError("Missing access token. Send Authorization: Bearer <token>.", 401);
}

export async function resolveAuthorizedScope(params: {
  request: NextRequest;
  scope: ApiScopeInput;
  client?: PoolClient;
}): Promise<AuthorizedScope> {
  const session = await resolveSessionUser(params.request);
  const resolvedScope = await resolveScope(params.scope, params.client, {
    allowWorkspaceAutocreate: false
  });

  const membership = await requireActiveWorkspaceMembership({
    workspaceId: resolvedScope.workspaceId,
    userId: session.userId,
    client: params.client
  });

  return {
    ...resolvedScope,
    userId: session.userId,
    workspaceRole: membership.role
  };
}
