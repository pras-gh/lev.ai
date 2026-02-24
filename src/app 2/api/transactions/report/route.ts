import { NextRequest, NextResponse } from "next/server";
import { readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  getTransactionReportingSummary,
  type ReportingPolicy
} from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (
    message.includes("must be") ||
    message.includes("policy") ||
    message.includes("Provide at least one scope identifier") ||
    message.includes("not found")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(params)
    });
    const policy = (params.get("policy") ?? "strict_ledger") as ReportingPolicy;
    const fromDate = params.get("fromDate") ?? undefined;
    const toDate = params.get("toDate") ?? undefined;

    const summary = await getTransactionReportingSummary({
      businessId: scope.businessId,
      workspaceId: scope.workspaceId,
      policy,
      fromDate,
      toDate
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build report";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
