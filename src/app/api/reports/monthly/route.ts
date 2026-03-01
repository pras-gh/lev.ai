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
  type ReasoningRiskFlag,
  type ReasoningTrace,
  type ReasoningTraceStep
} from "@/lib/reasoning-trace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutputFormat = "json" | "html" | "pdf";

function parseFormat(raw: string | null): OutputFormat {
  if (!raw || raw.trim() === "") {
    return "json";
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "json" || normalized === "html" || normalized === "pdf") {
    return normalized;
  }

  throw new Error("format must be one of: json, html, pdf");
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (
    message.includes("month ") ||
    message.includes("format ") ||
    message.includes("Provide at least one scope identifier") ||
    message.includes("not found") ||
    message.includes("must be")
  ) {
    return 400;
  }

  return 500;
}

function buildMonthlyReasoningTrace(params: {
  userQuery: string;
  generatedAt: Date;
  summary: MonthlySummary;
  format: OutputFormat;
}): ReasoningTrace {
  const riskFlags: ReasoningRiskFlag[] = [];
  const metrics = params.summary.metrics;

  if (metrics.profitEstimate < 0) {
    riskFlags.push({
      code: "negative_profit_estimate",
      severity: "high",
      title: "Profit estimate is negative",
      detail: `Current estimate: ₹${Math.abs(metrics.profitEstimate).toLocaleString("en-IN")}.`
    });
  }

  if (metrics.gstPayableEstimate > 0 && metrics.safeToSpendCash < metrics.gstPayableEstimate) {
    riskFlags.push({
      code: "gst_cash_coverage_gap",
      severity: "high",
      title: "GST reserve exceeds safe cash",
      detail: `GST payable ₹${metrics.gstPayableEstimate.toLocaleString("en-IN")} vs safe cash ₹${metrics.safeToSpendCash.toLocaleString("en-IN")}.`
    });
  }

  if (metrics.safeToSpendCash <= 0) {
    riskFlags.push({
      code: "no_safe_to_spend_cash",
      severity: "critical",
      title: "No safe-to-spend cash",
      detail: "Reserves currently absorb all closing cash."
    });
  }

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
        revenue: metrics.revenue,
        expenses: metrics.expenses,
        profit_estimate: metrics.profitEstimate,
        gst_payable_estimate: metrics.gstPayableEstimate
      },
      timestamp: offsetTimestamp(params.generatedAt, 0),
      confidence_score: confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["reserve_and_cash_model"],
      inputs: {
        closing_cash_balance: metrics.closingCashBalance,
        gst_payable_reserve: metrics.gstPayableReserve,
        upcoming_bills_reserve: metrics.upcomingBillsReserve
      },
      outputs: {
        safe_to_spend_cash: metrics.safeToSpendCash,
        reserve_buffer: metrics.reserveBuffer,
        assumptions: params.summary.assumptions
      },
      timestamp: offsetTimestamp(params.generatedAt, 180),
      confidence_score: confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: [params.format === "json" ? "json_report_response" : "build_monthly_summary_html"],
      inputs: {
        format: params.format
      },
      outputs: {
        month_label: params.summary.monthLabel,
        period_start: params.summary.periodStart,
        period_end_exclusive: params.summary.periodEndExclusive,
        risk_flags: riskFlags
      },
      timestamp: offsetTimestamp(params.generatedAt, 320),
      confidence_score: confidenceScore
    }
  ];

  return {
    multi_step_reasoning_chain: steps,
    tool_chaining: buildToolChainingFromSteps(steps),
    confidence_score: confidenceScore,
    risk_flags: riskFlags
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  let format: OutputFormat;

  try {
    format = parseFormat(params.get("format"));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid format");
  }

  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(params)
    });
    const month = params.get("month") ?? undefined;
    const gstRateGuessRaw = params.get("gstRateGuess");
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
    const generatedAtDate = new Date();
    const generatedAt = generatedAtDate.toISOString();
    const userQuery =
      params.get("query")?.trim().slice(0, 280) ||
      `Generate monthly summary report for ${summary.month}`;
    const reasoningTrace = buildMonthlyReasoningTrace({
      userQuery,
      generatedAt: generatedAtDate,
      summary,
      format
    });

    await writeReasoningAudit({
      request,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      endpoint: "api.reports.monthly",
      method: "GET",
      userQuery,
      trace: reasoningTrace,
      outputs: {
        month: summary.month,
        format,
        profit_estimate: summary.metrics.profitEstimate,
        safe_to_spend_cash: summary.metrics.safeToSpendCash
      },
      generatedAt
    });

    if (format === "json") {
      return NextResponse.json({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        ...summary,
        reasoningTrace
      });
    }

    const html = buildMonthlySummaryHtml({
      summary,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      autoPrint: format === "pdf"
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
      error instanceof Error ? error.message : "Failed to generate monthly summary";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
