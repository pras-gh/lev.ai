import { NextRequest, NextResponse } from "next/server";
import { badRequest, readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
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

type OverviewRange = "MTD" | "30D" | "90D";

type RevenueExpenseRow = {
  revenue: string;
  expenses: string;
};

type CashBalanceRow = {
  cash_balance: string;
};

type GstEstimateRow = {
  output_gst: string;
  input_gst: string;
};

type AlertAggregateRow = {
  itc_mismatch_alert_count: string;
  itc_mismatch_alert_value: string;
  anomaly_count: string;
};

const GST_DUE_DAY = 20;

const ITC_ELIGIBLE_HINTS = [
  "%marketing%",
  "%saas%",
  "%software%",
  "%logistics%",
  "%shipping%",
  "%rent%",
  "%utilities%",
  "%fixed cost%",
  "%internet%",
  "%electricity%",
  "%office%",
  "%operations%",
  "%professional%",
  "%subscription%",
  "%tax%"
];

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function parseRange(value: string | null): OverviewRange {
  const normalized = (value ?? "MTD").trim().toUpperCase();
  if (normalized === "MTD" || normalized === "30D" || normalized === "90D") {
    return normalized;
  }

  throw new Error("range must be one of: MTD, 30D, 90D");
}

function resolveRangeWindow(range: OverviewRange, now: Date): { from: Date; to: Date } {
  if (range === "MTD") {
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)),
      to: now
    };
  }

  const days = range === "30D" ? 30 : 90;
  return {
    from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    to: now
  };
}

function resolveGstCycle(now: Date): {
  cycleStart: Date;
  cycleEnd: Date;
  dueDate: Date;
  dueInDays: number;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const currentDue = new Date(Date.UTC(year, month, GST_DUE_DAY, 0, 0, 0));

  let cycleStart: Date;
  let cycleEnd: Date;
  let dueDate: Date;

  if (now.getTime() <= currentDue.getTime()) {
    cycleStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    cycleEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    dueDate = currentDue;
  } else {
    cycleStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    cycleEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
    dueDate = new Date(Date.UTC(year, month + 1, GST_DUE_DAY, 0, 0, 0));
  }

  return {
    cycleStart,
    cycleEnd,
    dueDate,
    dueInDays: (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  };
}

function buildOverviewReasoningTrace(params: {
  userQuery: string;
  range: OverviewRange;
  generatedAt: Date;
  cashBalance: number;
  runwayDays: number;
  revenueMtd: number;
  expensesMtd: number;
  gstDueDays: number;
  gstEstPayable: number;
  itcMismatchCount: number;
  itcMismatchValue: number;
  anomalyCount: number;
  reconciliationPct: number;
  monthCloseReadinessPct: number;
  complianceConfidenceRaw: number;
}): ReasoningTrace {
  const riskFlags: ReasoningRiskFlag[] = [];

  if (params.runwayDays > 0 && params.runwayDays < 60) {
    riskFlags.push({
      code: "cash_runway_tight",
      severity: params.runwayDays < 30 ? "critical" : "high",
      title: "Cash runway is tight",
      detail: `Estimated runway is ${round2(params.runwayDays)} day(s).`
    });
  }

  if (params.gstEstPayable > 0 && params.gstDueDays <= 7) {
    riskFlags.push({
      code: "gst_due_soon",
      severity: params.gstDueDays <= 3 ? "critical" : "high",
      title: "GST due date approaching",
      detail: `Estimated payable ₹${params.gstEstPayable.toLocaleString("en-IN")} due in ${params.gstDueDays} day(s).`
    });
  }

  if (params.itcMismatchCount > 0) {
    riskFlags.push({
      code: "itc_mismatch_open",
      severity: "medium",
      title: "ITC mismatch detected",
      detail: `${params.itcMismatchCount} open mismatch alert(s), value ₹${params.itcMismatchValue.toLocaleString("en-IN")}.`
    });
  }

  if (params.anomalyCount > 0) {
    riskFlags.push({
      code: "anomaly_open",
      severity: "medium",
      title: "Operational anomalies open",
      detail: `${params.anomalyCount} anomaly alert(s) currently open.`
    });
  }

  let confidenceScore = normalizeConfidenceScore(params.complianceConfidenceRaw);
  if (params.anomalyCount >= 4) {
    confidenceScore = normalizeConfidenceScore(confidenceScore - 0.05);
  }
  if (params.itcMismatchCount > 0) {
    confidenceScore = normalizeConfidenceScore(confidenceScore - 0.03);
  }

  const steps: ReasoningTraceStep[] = [
    {
      user_query: params.userQuery,
      tools_called: ["compute_finance_health"],
      inputs: {
        range: params.range
      },
      outputs: {
        reconciliation_pct: params.reconciliationPct,
        month_close_readiness_pct: params.monthCloseReadinessPct,
        compliance_confidence: round2(params.complianceConfidenceRaw)
      },
      timestamp: offsetTimestamp(params.generatedAt, 0),
      confidence_score: confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["get_revenue_expense_aggregate", "get_cash_balance"],
      inputs: {
        range: params.range
      },
      outputs: {
        revenue_mtd: params.revenueMtd,
        expenses_mtd: params.expensesMtd,
        cash_balance: params.cashBalance,
        runway_days: params.runwayDays
      },
      timestamp: offsetTimestamp(params.generatedAt, 200),
      confidence_score: confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["estimate_gst_payable", "aggregate_alerts"],
      inputs: {
        gst_window: "current_cycle"
      },
      outputs: {
        gst_due_days: params.gstDueDays,
        gst_est_payable: params.gstEstPayable,
        itc_mismatch_count: params.itcMismatchCount,
        anomaly_count: params.anomalyCount
      },
      timestamp: offsetTimestamp(params.generatedAt, 400),
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
    const range = parseRange(request.nextUrl.searchParams.get("range"));
    const now = new Date();
    const rangeWindow = resolveRangeWindow(range, now);
    const gstCycle = resolveGstCycle(now);
    const db = getDbPool();

    const [health, revenueExpenseResult, cashResult, gstResult, alertResult] = await Promise.all([
      computeFinanceHealth({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        syncAlerts: false
      }),
      db.query<RevenueExpenseRow>(
        `
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_minor ELSE 0 END), 0)::text AS revenue,
          COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE 0 END), 0)::text AS expenses
        FROM transactions
        WHERE workspace_id = $1::uuid
          AND is_hidden = FALSE
          AND status <> 'pending'
          AND occurred_at >= $2::timestamptz
          AND occurred_at < $3::timestamptz
        `,
        [scope.workspaceId, rangeWindow.from.toISOString(), rangeWindow.to.toISOString()]
      ),
      db.query<CashBalanceRow>(
        `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN direction = 'credit' THEN amount_minor
                ELSE -amount_minor
              END
            ),
            0
          )::text AS cash_balance
        FROM transactions
        WHERE workspace_id = $1::uuid
          AND is_hidden = FALSE
          AND status <> 'pending'
        `,
        [scope.workspaceId]
      ),
      db.query<GstEstimateRow>(
        `
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'credit' AND t.gst_applicable = TRUE THEN
                  CASE
                    WHEN COALESCE(t.gst_amount, 0) > 0 THEN t.gst_amount
                    WHEN COALESCE(t.gst_rate, 0) > 0 THEN ABS(t.amount_minor) * t.gst_rate / 100
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          )::text AS output_gst,
          COALESCE(
            SUM(
              CASE
                WHEN t.direction = 'debit'
                  AND t.gst_applicable = TRUE
                  AND COALESCE(c.name, '') ILIKE ANY($4::text[]) THEN
                  CASE
                    WHEN COALESCE(t.gst_amount, 0) > 0 THEN t.gst_amount
                    WHEN COALESCE(t.gst_rate, 0) > 0 THEN ABS(t.amount_minor) * t.gst_rate / 100
                    ELSE 0
                  END
                ELSE 0
              END
            ),
            0
          )::text AS input_gst
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.workspace_id = $1::uuid
          AND t.is_hidden = FALSE
          AND t.status IN ('posted', 'reversed')
          AND t.occurred_at >= $2::timestamptz
          AND t.occurred_at < $3::timestamptz
        `,
        [
          scope.workspaceId,
          gstCycle.cycleStart.toISOString(),
          gstCycle.cycleEnd.toISOString(),
          ITC_ELIGIBLE_HINTS
        ]
      ),
      db.query<AlertAggregateRow>(
        `
        SELECT
          COUNT(*) FILTER (WHERE type = 'itc_mismatch' AND status = 'open')::text AS itc_mismatch_alert_count,
          COALESCE(
            SUM(
              CASE
                WHEN type = 'itc_mismatch'
                  AND status = 'open'
                  AND COALESCE(payload->>'mismatchAmount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
                THEN (payload->>'mismatchAmount')::numeric
                ELSE 0
              END
            ),
            0
          )::text AS itc_mismatch_alert_value,
          COUNT(*) FILTER (
            WHERE status = 'open'
              AND type IN (
                'refund_spike',
                'reconciliation_gap',
                'sync_failure',
                'anomaly_detected',
                'cash_runway_risk',
                'duplicate',
                'unmatched'
              )
          )::text AS anomaly_count
        FROM alerts
        WHERE workspace_id = $1::uuid
        `,
        [scope.workspaceId]
      )
    ]);

    const revenueRow = revenueExpenseResult.rows[0];
    const cashRow = cashResult.rows[0];
    const gstRow = gstResult.rows[0];
    const alertRow = alertResult.rows[0];

    const revenueMtd = round2(toNumber(revenueRow?.revenue));
    const expensesMtd = round2(toNumber(revenueRow?.expenses));
    const cashBalance = round2(toNumber(cashRow?.cash_balance));
    const outputGst = toNumber(gstRow?.output_gst);
    const inputGst = toNumber(gstRow?.input_gst);
    const gstEstPayable = round2(Math.max(0, outputGst - inputGst));
    const gstDueDays = Math.max(0, Math.ceil(gstCycle.dueInDays));
    const itcMismatchValue = round2(toNumber(alertRow?.itc_mismatch_alert_value));
    const itcMismatchCount = Math.max(
      Math.trunc(health.itc_mismatch_count),
      Math.trunc(toNumber(alertRow?.itc_mismatch_alert_count))
    );
    const anomalyCount = Math.trunc(toNumber(alertRow?.anomaly_count));
    const runwayDays = round2(health.cash_runway_months * 30);
    const generatedAt = now.toISOString();
    const userQuery =
      request.nextUrl.searchParams.get("query")?.trim().slice(0, 280) ||
      `Finance overview for ${range}`;
    const reasoningTrace = buildOverviewReasoningTrace({
      userQuery,
      range,
      generatedAt: now,
      cashBalance,
      runwayDays,
      revenueMtd,
      expensesMtd,
      gstDueDays,
      gstEstPayable,
      itcMismatchCount,
      itcMismatchValue,
      anomalyCount,
      reconciliationPct: round2(health.recon_match_pct),
      monthCloseReadinessPct: round2(health.month_close_readiness_pct),
      complianceConfidenceRaw: round2(health.compliance_confidence)
    });

    await writeReasoningAudit({
      request,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      endpoint: "api.metrics.overview",
      method: "GET",
      userQuery,
      trace: reasoningTrace,
      outputs: {
        range,
        cash_balance: cashBalance,
        runway_days: runwayDays,
        gst_est_payable: gstEstPayable,
        anomaly_count: anomalyCount
      },
      generatedAt
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      range,
      cash_balance: cashBalance,
      runway_days: runwayDays,
      revenue_mtd: revenueMtd,
      expenses_mtd: expensesMtd,
      gst_due_days: gstDueDays,
      gst_est_payable: gstEstPayable,
      itc_mismatch_count: itcMismatchCount,
      itc_mismatch_value: itcMismatchValue,
      reconciliation_pct: round2(health.recon_match_pct),
      anomaly_count: anomalyCount,
      month_close_readiness_pct: round2(health.month_close_readiness_pct),
      compliance_confidence: round2(health.compliance_confidence),
      generatedAt,
      reasoningTrace
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute overview metrics";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    if (message.includes("range must be")) {
      return badRequest(message);
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
