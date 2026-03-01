import { NextRequest, NextResponse } from "next/server";
import { badRequest, readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  buildMonthlySummaryHtml,
  computeMonthlySummary,
  type MonthlySummary
} from "@/lib/monthly-summary";
import { writeReasoningAudit } from "@/lib/reasoning-audit";
import {
  buildToolChainingFromSteps,
  normalizeConfidenceScore,
  offsetTimestamp,
  type ReasoningTrace,
  type ReasoningTraceStep
} from "@/lib/reasoning-trace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ month: string }>;
};

function buildHtmlMonthlyTrace(params: {
  userQuery: string;
  summary: MonthlySummary;
  generatedAt: Date;
  autoPrint: boolean;
}): ReasoningTrace {
  const usedFallback = params.summary.assumptions.some((assumption) =>
    assumption.toLowerCase().includes("fallback applied")
  );
  const confidenceScore = normalizeConfidenceScore(usedFallback ? 0.74 : 0.9);

  const steps: ReasoningTraceStep[] = [
    {
      user_query: params.userQuery,
      tools_called: ["compute_monthly_summary"],
      inputs: {
        month: params.summary.month
      },
      outputs: {
        revenue: params.summary.metrics.revenue,
        expenses: params.summary.metrics.expenses,
        profit_estimate: params.summary.metrics.profitEstimate
      },
      timestamp: offsetTimestamp(params.generatedAt, 0),
      confidence_score: confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["build_monthly_summary_html"],
      inputs: {
        auto_print: params.autoPrint
      },
      outputs: {
        filename: `monthly-summary-${params.summary.month}.html`
      },
      timestamp: offsetTimestamp(params.generatedAt, 150),
      confidence_score: confidenceScore
    }
  ];

  return {
    multi_step_reasoning_chain: steps,
    tool_chaining: buildToolChainingFromSteps(steps),
    confidence_score: confidenceScore,
    risk_flags: []
  };
}

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
    const generatedAtDate = new Date();
    const generatedAt = generatedAtDate.toISOString();
    const userQuery =
      request.nextUrl.searchParams.get("query")?.trim().slice(0, 280) ||
      `Generate monthly summary HTML for ${summary.month}`;
    const reasoningTrace = buildHtmlMonthlyTrace({
      userQuery,
      summary,
      generatedAt: generatedAtDate,
      autoPrint
    });

    await writeReasoningAudit({
      request,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      endpoint: "api.reports.monthly_html",
      method: "GET",
      userQuery,
      trace: reasoningTrace,
      outputs: {
        month: summary.month,
        auto_print: autoPrint,
        filename: `monthly-summary-${summary.month}.html`
      },
      generatedAt
    });

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
