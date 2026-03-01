import { NextRequest, NextResponse } from "next/server";
import { readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { computeFinanceHealth } from "@/lib/finance-health";
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

function buildHealthReasoningTrace(params: {
  userQuery: string;
  generatedAt: Date;
  cashRunwayMonths: number;
  gstDueAmountNext7d: number;
  itcMismatchCount: number;
  reconMatchPct: number;
  monthCloseReadinessPct: number;
  complianceConfidenceRaw: number;
}): ReasoningTrace {
  const riskFlags: ReasoningRiskFlag[] = [];

  if (params.cashRunwayMonths > 0 && params.cashRunwayMonths < 3) {
    riskFlags.push({
      code: "cash_runway_risk",
      severity: params.cashRunwayMonths < 1.5 ? "critical" : "high",
      title: "Cash runway risk",
      detail: `Runway is ${params.cashRunwayMonths.toFixed(2)} month(s).`
    });
  }

  if (params.gstDueAmountNext7d > 0) {
    riskFlags.push({
      code: "gst_due_next_7d",
      severity: "high",
      title: "GST outflow due soon",
      detail: `Estimated payable in 7 days: ₹${params.gstDueAmountNext7d.toLocaleString("en-IN")}.`
    });
  }

  if (params.itcMismatchCount > 0) {
    riskFlags.push({
      code: "itc_mismatch",
      severity: "medium",
      title: "ITC mismatch present",
      detail: `${params.itcMismatchCount} ITC mismatch item(s) detected.`
    });
  }

  const confidenceScore = normalizeConfidenceScore(params.complianceConfidenceRaw);
  const steps: ReasoningTraceStep[] = [
    {
      user_query: params.userQuery,
      tools_called: ["compute_finance_health"],
      inputs: {
        scope: "workspace"
      },
      outputs: {
        cash_runway_months: params.cashRunwayMonths,
        gst_due_amount_next_7d: params.gstDueAmountNext7d,
        itc_mismatch_count: params.itcMismatchCount
      },
      timestamp: offsetTimestamp(params.generatedAt, 0),
      confidence_score: confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["health_signal_synthesis"],
      inputs: {
        reconciliation: params.reconMatchPct,
        month_close_readiness: params.monthCloseReadinessPct
      },
      outputs: {
        compliance_confidence: params.complianceConfidenceRaw,
        risk_flags: riskFlags
      },
      timestamp: offsetTimestamp(params.generatedAt, 150),
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
    const generatedAtDate = new Date();
    const generatedAt = generatedAtDate.toISOString();
    const userQuery =
      request.nextUrl.searchParams.get("query")?.trim().slice(0, 280) ||
      "Compute finance health metrics";
    const reasoningTrace = buildHealthReasoningTrace({
      userQuery,
      generatedAt: generatedAtDate,
      cashRunwayMonths: metrics.cash_runway_months,
      gstDueAmountNext7d: metrics.gst_due_amount_next_7d,
      itcMismatchCount: metrics.itc_mismatch_count,
      reconMatchPct: metrics.recon_match_pct,
      monthCloseReadinessPct: metrics.month_close_readiness_pct,
      complianceConfidenceRaw: metrics.compliance_confidence
    });

    await writeReasoningAudit({
      request,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      endpoint: "api.metrics.health",
      method: "GET",
      userQuery,
      trace: reasoningTrace,
      outputs: {
        cash_runway_months: metrics.cash_runway_months,
        gst_due_amount_next_7d: metrics.gst_due_amount_next_7d,
        itc_mismatch_count: metrics.itc_mismatch_count
      },
      generatedAt
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      ...metrics,
      generatedAt,
      reasoningTrace
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
