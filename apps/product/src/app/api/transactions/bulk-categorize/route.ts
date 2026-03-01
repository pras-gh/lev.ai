import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toObjectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Body must be a JSON object");
  }

  return value as Record<string, unknown>;
}

function parseTransactionIds(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("transactionIds must be a non-empty array");
  }

  const unique = new Set<number>();
  for (const value of raw) {
    const parsed =
      typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error("transactionIds[] must be positive integers");
    }
    unique.add(parsed);
  }

  if (unique.size > 500) {
    throw new Error("transactionIds cannot contain more than 500 ids in one request");
  }

  return [...unique];
}

function forwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  headers.set("content-type", "application/json");

  const authHeaders = [
    "authorization",
    "x-supabase-access-token",
    "x-access-token",
    "cookie"
  ] as const;

  for (const key of authHeaders) {
    const value = request.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  return headers;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  try {
    const payload = toObjectBody(body);
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });
    const transactionIds = parseTransactionIds(payload.transactionIds);
    const categoryId =
      payload.categoryId === null
        ? null
        : toOptionalPositiveInt(payload.categoryId, "categoryId");

    if (payload.categoryId !== null && categoryId === undefined) {
      return badRequest("categoryId must be a positive integer or null");
    }

    const forwardedPayload: Record<string, unknown> = {
      action: "categorize",
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      transactionIds,
      categoryId
    };

    if (typeof payload.note === "string" && payload.note.trim().length > 0) {
      forwardedPayload.note = payload.note.trim();
    }

    const batchResponse = await fetch(new URL("/api/transactions/batch", request.url), {
      method: "POST",
      headers: forwardHeaders(request),
      body: JSON.stringify(forwardedPayload),
      cache: "no-store"
    });

    const responseText = await batchResponse.text();
    let responseBody: unknown = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText) as unknown;
      } catch {
        responseBody = { raw: responseText };
      }
    }

    if (!batchResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to bulk categorize transactions",
          details: responseBody
        },
        { status: batchResponse.status }
      );
    }

    return NextResponse.json(
      typeof responseBody === "object" && responseBody !== null
        ? responseBody
        : { result: responseBody }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to bulk categorize transactions";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    if (
      message.includes("Body must be a JSON object") ||
      message.includes("transactionIds") ||
      message.includes("categoryId must be")
    ) {
      return badRequest(message);
    }

    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found") ||
      message.includes("must be")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
