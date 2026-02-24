import { NextRequest, NextResponse } from "next/server";
import { badRequest, readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  buildMonthlySummaryHtml,
  computeMonthlySummary
} from "@/lib/monthly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ month: string }>;
};

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (
    message.includes("month ") ||
    message.includes("Provide at least one scope identifier") ||
    message.includes("not found") ||
    message.includes("must be")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });
    const { month } = await params;
    const gstRateGuessRaw = request.nextUrl.searchParams.get("gstRateGuess");
    let gstRateGuessPct: number | undefined;
    if (gstRateGuessRaw && gstRateGuessRaw.trim() !== "") {
      const parsed = Number(gstRateGuessRaw);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        return badRequest("gstRateGuess must be a number between 0 and 100");
      }
      gstRateGuessPct = parsed;
    }

    const summary = await computeMonthlySummary({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      month,
      gstRateGuessPct
    });
    const autoPrint = request.nextUrl.searchParams.get("autoPrint") === "true";

    const html = buildMonthlySummaryHtml({
      summary,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      autoPrint
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="monthly-summary-${summary.month}.html"`
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate monthly summary HTML";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
