import { NextRequest, NextResponse } from "next/server";
import { readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { computeFinanceHealth } from "@/lib/finance-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });
    const metrics = await computeFinanceHealth({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      syncAlerts: false
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      ...metrics
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute metrics";
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
