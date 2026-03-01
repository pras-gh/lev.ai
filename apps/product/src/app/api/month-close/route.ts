import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalBoolean,
  toOptionalNumber,
  toOptionalPositiveInt,
  toOptionalText
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { runCloseMonthPipeline } from "@/lib/month-close";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (
    message.includes("month ") ||
    message.includes("must be") ||
    message.includes("Provide at least one scope identifier") ||
    message.includes("not found")
  ) {
    return 400;
  }

  return 500;
}

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

    const month = toOptionalText(payload.month);
    const ruleLimit = toOptionalPositiveInt(payload.ruleLimit, "ruleLimit");
    const confidenceThreshold = toOptionalNumber(
      payload.confidenceThreshold,
      "confidenceThreshold"
    );
    const reconcileLimit = toOptionalPositiveInt(
      payload.reconcileLimit,
      "reconcileLimit"
    );
    const reconcileMaxDateWindowDays = toOptionalPositiveInt(
      payload.reconcileMaxDateWindowDays,
      "reconcileMaxDateWindowDays"
    );
    const reconcileConfidenceThreshold = toOptionalNumber(
      payload.reconcileConfidenceThreshold,
      "reconcileConfidenceThreshold"
    );
    const sendWhatsAppDigest = toOptionalBoolean(
      payload.sendWhatsAppDigest,
      "sendWhatsAppDigest"
    );

    if (
      confidenceThreshold !== undefined &&
      (confidenceThreshold < 0 || confidenceThreshold > 1)
    ) {
      return badRequest("confidenceThreshold must be between 0 and 1");
    }

    if (
      reconcileConfidenceThreshold !== undefined &&
      (reconcileConfidenceThreshold < 0 || reconcileConfidenceThreshold > 1)
    ) {
      return badRequest("reconcileConfidenceThreshold must be between 0 and 1");
    }

    const result = await runCloseMonthPipeline({
      request,
      scope: {
        workspaceId: scope.workspaceId,
        businessId: scope.businessId
      },
      options: {
        month: month ?? undefined,
        ruleLimit,
        confidenceThreshold,
        reconcileLimit,
        reconcileMaxDateWindowDays,
        reconcileConfidenceThreshold,
        sendWhatsAppDigest
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run month close";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
