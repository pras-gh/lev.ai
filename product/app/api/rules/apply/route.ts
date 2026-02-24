import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalPositiveInt
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { applyRulesV0ForWorkspace } from "@/lib/rules-engine-v0";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;

  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });
    const limit = toOptionalPositiveInt(payload.limit, "limit");
    const confidenceThreshold = toOptionalNumber(payload.confidenceThreshold, "confidenceThreshold");
    const includeDeleted = toOptionalBoolean(payload.includeDeleted, "includeDeleted");

    if (confidenceThreshold !== undefined && (confidenceThreshold < 0 || confidenceThreshold > 1)) {
      return badRequest("confidenceThreshold must be between 0 and 1");
    }

    const result = await applyRulesV0ForWorkspace({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      limit,
      confidenceThreshold,
      includeDeleted
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply rules";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
