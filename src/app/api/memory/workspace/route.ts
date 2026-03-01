import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  getWorkspaceMemory,
  upsertWorkspaceMemory
} from "@/lib/memory/service";
import type {
  AccountingMethod,
  MemoryPreferenceValue,
  WorkspaceMemoryUpdate
} from "@/lib/memory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`${fieldName} must be an array of strings`);
  }

  return value;
}

function parseAccountingMethod(value: unknown): AccountingMethod | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (value === "cash" || value === "accrual") {
    return value;
  }

  throw new Error("accountingMethod must be 'cash' or 'accrual'");
}

function parseIndustry(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("industry must be a string");
  }

  return value;
}

function parseUserPreferences(
  value: unknown
): Record<string, MemoryPreferenceValue> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("userPreferences must be an object");
  }

  const preferences: Record<string, MemoryPreferenceValue> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      preferences[key] = raw;
      continue;
    }

    throw new Error(
      "userPreferences values must be string, number, or boolean"
    );
  }

  return preferences;
}

function parseUpdatePayload(payload: Record<string, unknown>): WorkspaceMemoryUpdate {
  return {
    industry: parseIndustry(payload.industry),
    accountingMethod: parseAccountingMethod(payload.accountingMethod),
    recurringVendors: parseStringArray(payload.recurringVendors, "recurringVendors"),
    customCategories: parseStringArray(payload.customCategories, "customCategories"),
    userPreferences: parseUserPreferences(payload.userPreferences)
  };
}

function hasAnyMemoryField(update: WorkspaceMemoryUpdate): boolean {
  return (
    update.industry !== undefined ||
    update.accountingMethod !== undefined ||
    update.recurringVendors !== undefined ||
    update.customCategories !== undefined ||
    update.userPreferences !== undefined
  );
}

export async function GET(request: NextRequest) {
  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });

    const memory = await getWorkspaceMemory(scope.workspaceId);
    return NextResponse.json({
      workspaceId: scope.workspaceId,
      memory
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read workspace memory";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("must be")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;

  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });

    const update = parseUpdatePayload(payload);
    if (!hasAnyMemoryField(update)) {
      return badRequest(
        "Provide at least one field: industry, accountingMethod, recurringVendors, customCategories, userPreferences"
      );
    }

    const memory = await upsertWorkspaceMemory({
      workspaceId: scope.workspaceId,
      actorUserId: scope.userId,
      update
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      memory
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to write workspace memory";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("must be")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
