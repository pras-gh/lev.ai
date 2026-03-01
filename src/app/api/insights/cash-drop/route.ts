import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { analyzeCashDrop } from "@/lib/cash-drop-analysis";
import { writeReasoningAudit } from "@/lib/reasoning-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_QUERY = "Why did our cash drop this month?";

function parseQueryInput(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_QUERY;
  }

  return value.trim().slice(0, 280);
}

export async function GET(request: NextRequest) {
  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });
    const query = parseQueryInput(request.nextUrl.searchParams.get("query"));

    const analysis = await analyzeCashDrop({
      workspaceId: scope.workspaceId,
      query
    });
    await writeReasoningAudit({
      request,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      endpoint: "api.insights.cash_drop",
      method: "GET",
      userQuery: query,
      trace: analysis.reasoningChain,
      outputs: {
        headline: analysis.reasoning.headline,
        risk_flags_count: analysis.reasoningChain.risk_flags.length
      },
      generatedAt: analysis.generatedAt
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      analysis
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate cash drop insight";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
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
    const query = parseQueryInput(payload.query);

    const analysis = await analyzeCashDrop({
      workspaceId: scope.workspaceId,
      query
    });
    await writeReasoningAudit({
      request,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      endpoint: "api.insights.cash_drop",
      method: "POST",
      userQuery: query,
      trace: analysis.reasoningChain,
      outputs: {
        headline: analysis.reasoning.headline,
        risk_flags_count: analysis.reasoningChain.risk_flags.length
      },
      generatedAt: analysis.generatedAt
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      analysis
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate cash drop insight";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
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
