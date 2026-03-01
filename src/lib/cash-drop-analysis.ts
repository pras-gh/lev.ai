import type { Pool, PoolClient } from "pg";
import { getDbPool } from "@/lib/db";
import {
  createFinanceBoundaryEnvelope,
  type FinanceBoundaryEnvelope
} from "@/lib/finance-computation-boundary";
import {
  buildToolChainingFromSteps,
  normalizeConfidenceScore,
  offsetTimestamp,
  type ReasoningRiskFlag,
  type ReasoningTrace,
  type ReasoningTraceStep
} from "@/lib/reasoning-trace";

type MonthWindow = {
  key: string;
  start: Date;
  endExclusive: Date;
};

type CashBalanceRow = {
  cash_balance: string;
};

type ExpenseContributorRow = {
  bucket: string;
  amount: string;
};

type FlowAggregateRow = {
  current_inflow: string;
  current_outflow: string;
  previous_inflow: string;
  previous_outflow: string;
};

type OpenAlertRow = {
  type: string;
  severity: string;
  title: string | null;
  body: string | null;
  created_at: string;
};

type BurnRow = {
  expense_90d: string;
};

type ExpenseContributor = {
  bucket: string;
  amount: number;
  sharePct: number;
};

type AlertsSummary = {
  openCount: number;
  topAlerts: Array<{
    type: string;
    severity: string;
    title: string;
    body: string | null;
    createdAt: string;
  }>;
};

type RunwaySummary = {
  previousMonths: number | null;
  currentMonths: number | null;
  deltaMonths: number | null;
};

type CashBalanceOutput = {
  currentCash: number;
  previousCash: number;
  monthDelta: number;
  monthDrop: number;
};

type ExpenseBreakdownOutput = {
  totalOutflow: number;
  contributors: ExpenseContributor[];
  inventorySharePct: number;
  salarySharePct: number;
};

type CompareOutput = {
  currentMonth: {
    inflow: number;
    outflow: number;
    net: number;
  };
  previousMonth: {
    inflow: number;
    outflow: number;
    net: number;
  };
  netDelta: number;
};

type AlertCheckOutput = AlertsSummary;

type ToolCallResult<Name extends string, Output> = {
  tool: Name;
  output: Output;
};

type CashDropPeriod = {
  currentMonth: string;
  currentStart: string;
  currentEndExclusive: string;
  previousStart: string;
  previousEndExclusive: string;
};

type CashDropToolCalls = [
  ToolCallResult<"get_cash_balance", CashBalanceOutput>,
  ToolCallResult<"get_expense_breakdown", ExpenseBreakdownOutput>,
  ToolCallResult<"compare_with_last_month", CompareOutput>,
  ToolCallResult<"alert_engine_check", AlertCheckOutput>
];

type CashDropReasoning = {
  headline: string;
  bullets: string[];
  suggestion: string;
};

type CashDropReasoningChain = ReasoningTrace;

export type CashDropAnalysis = {
  query: string;
  period: CashDropPeriod;
  toolCalls: CashDropToolCalls;
  reasoning: CashDropReasoning;
  reasoningChain: CashDropReasoningChain;
  boundary: FinanceBoundaryEnvelope<{
    period: CashDropPeriod;
    toolCalls: CashDropToolCalls;
    generatedAt: string;
  }>;
  generatedAt: string;
};

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

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatInr(value: number): string {
  const abs = Math.abs(value);
  return `₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function resolveMonthWindow(referenceDate: Date): MonthWindow {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));

  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    start,
    endExclusive
  };
}

function resolvePreviousMonthWindow(current: MonthWindow): MonthWindow {
  const previousMonthEnd = new Date(current.start.getTime());
  const previousMonthReference = new Date(previousMonthEnd.getTime() - 24 * 60 * 60 * 1000);
  return resolveMonthWindow(previousMonthReference);
}

async function queryCashBalanceAt(params: {
  db: Pool | PoolClient;
  workspaceId: string;
  asOfExclusive: Date;
}): Promise<number> {
  const result = await params.db.query<CashBalanceRow>(
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
      AND occurred_at < $2::timestamptz
    `,
    [params.workspaceId, params.asOfExclusive.toISOString()]
  );

  return round2(toNumber(result.rows[0]?.cash_balance));
}

async function queryExpenseBreakdown(params: {
  db: Pool | PoolClient;
  workspaceId: string;
  start: Date;
  endExclusive: Date;
}): Promise<ExpenseContributor[]> {
  const result = await params.db.query<ExpenseContributorRow>(
    `
    SELECT
      COALESCE(
        NULLIF(TRIM(c.name), ''),
        NULLIF(TRIM(t.counterparty), ''),
        NULLIF(TRIM(t.description), ''),
        'Uncategorized'
      ) AS bucket,
      COALESCE(SUM(ABS(t.amount_minor)), 0)::text AS amount
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.workspace_id = $1::uuid
      AND t.is_hidden = FALSE
      AND t.status <> 'pending'
      AND t.direction = 'debit'
      AND t.occurred_at >= $2::timestamptz
      AND t.occurred_at < $3::timestamptz
    GROUP BY 1
    ORDER BY amount::numeric DESC
    LIMIT 8
    `,
    [params.workspaceId, params.start.toISOString(), params.endExclusive.toISOString()]
  );

  const total = result.rows.reduce((sum, row) => sum + toNumber(row.amount), 0);
  if (total <= 0) {
    return [];
  }

  return result.rows.map((row) => {
    const amount = round2(toNumber(row.amount));
    return {
      bucket: row.bucket,
      amount,
      sharePct: round2((amount / total) * 100)
    };
  });
}

async function queryFlowComparison(params: {
  db: Pool | PoolClient;
  workspaceId: string;
  current: MonthWindow;
  previous: MonthWindow;
}): Promise<CompareOutput> {
  const result = await params.db.query<FlowAggregateRow>(
    `
    SELECT
      COALESCE(SUM(
        CASE WHEN direction = 'credit'
          AND occurred_at >= $2::timestamptz
          AND occurred_at < $3::timestamptz
        THEN amount_minor ELSE 0 END
      ), 0)::text AS current_inflow,
      COALESCE(SUM(
        CASE WHEN direction = 'debit'
          AND occurred_at >= $2::timestamptz
          AND occurred_at < $3::timestamptz
        THEN amount_minor ELSE 0 END
      ), 0)::text AS current_outflow,
      COALESCE(SUM(
        CASE WHEN direction = 'credit'
          AND occurred_at >= $4::timestamptz
          AND occurred_at < $5::timestamptz
        THEN amount_minor ELSE 0 END
      ), 0)::text AS previous_inflow,
      COALESCE(SUM(
        CASE WHEN direction = 'debit'
          AND occurred_at >= $4::timestamptz
          AND occurred_at < $5::timestamptz
        THEN amount_minor ELSE 0 END
      ), 0)::text AS previous_outflow
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND occurred_at >= $4::timestamptz
      AND occurred_at < $3::timestamptz
    `,
    [
      params.workspaceId,
      params.current.start.toISOString(),
      params.current.endExclusive.toISOString(),
      params.previous.start.toISOString(),
      params.previous.endExclusive.toISOString()
    ]
  );

  const row = result.rows[0];
  const currentInflow = round2(toNumber(row?.current_inflow));
  const currentOutflow = round2(toNumber(row?.current_outflow));
  const previousInflow = round2(toNumber(row?.previous_inflow));
  const previousOutflow = round2(toNumber(row?.previous_outflow));
  const currentNet = round2(currentInflow - currentOutflow);
  const previousNet = round2(previousInflow - previousOutflow);

  return {
    currentMonth: {
      inflow: currentInflow,
      outflow: currentOutflow,
      net: currentNet
    },
    previousMonth: {
      inflow: previousInflow,
      outflow: previousOutflow,
      net: previousNet
    },
    netDelta: round2(currentNet - previousNet)
  };
}

async function queryOpenAlerts(params: {
  db: Pool | PoolClient;
  workspaceId: string;
}): Promise<AlertsSummary> {
  const result = await params.db.query<OpenAlertRow>(
    `
    SELECT
      type,
      severity,
      title,
      body,
      created_at::text
    FROM alerts
    WHERE workspace_id = $1::uuid
      AND status = 'open'
      AND type IN (
        'cash_runway_risk',
        'gst_due',
        'itc_mismatch',
        'refund_spike',
        'reconciliation_gap',
        'sync_failure',
        'anomaly_detected'
      )
    ORDER BY created_at DESC
    LIMIT 5
    `,
    [params.workspaceId]
  );

  return {
    openCount: result.rows.length,
    topAlerts: result.rows.map((row) => ({
      type: row.type,
      severity: row.severity,
      title: row.title ?? row.type,
      body: row.body,
      createdAt: row.created_at
    }))
  };
}

async function queryRunwayAt(params: {
  db: Pool | PoolClient;
  workspaceId: string;
  cutoffExclusive: Date;
  cashBalance: number;
}): Promise<number | null> {
  const burnResult = await params.db.query<BurnRow>(
    `
    SELECT
      COALESCE(SUM(ABS(amount_minor)), 0)::text AS expense_90d
    FROM transactions
    WHERE workspace_id = $1::uuid
      AND is_hidden = FALSE
      AND status <> 'pending'
      AND direction = 'debit'
      AND occurred_at >= ($2::timestamptz - INTERVAL '90 days')
      AND occurred_at < $2::timestamptz
    `,
    [params.workspaceId, params.cutoffExclusive.toISOString()]
  );

  const expense90d = toNumber(burnResult.rows[0]?.expense_90d);
  const monthlyBurn = expense90d / 3;
  if (monthlyBurn <= 0) {
    return null;
  }

  return round2(params.cashBalance / monthlyBurn);
}

function computeThemeShare(contributors: ExpenseContributor[], hints: string[]): number {
  const total = contributors.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) {
    return 0;
  }

  const matched = contributors
    .filter((item) => {
      const normalized = normalizeText(item.bucket);
      return hints.some((hint) => normalized.includes(hint));
    })
    .reduce((sum, item) => sum + item.amount, 0);

  return round2((matched / total) * 100);
}

function buildReasoning(params: {
  cash: CashBalanceOutput;
  breakdown: ExpenseBreakdownOutput;
  runway: RunwaySummary;
  alerts: AlertsSummary;
}): CashDropReasoning {
  const bullets: string[] = [];
  const dropAmount = params.cash.monthDrop;
  const top1 = params.breakdown.contributors[0];
  const top2 = params.breakdown.contributors[1];

  if (params.breakdown.inventorySharePct > 0) {
    bullets.push(
      `${params.breakdown.inventorySharePct}% of outflow came from inventory-heavy spending.`
    );
  }

  if (params.breakdown.salarySharePct > 0) {
    bullets.push(`${params.breakdown.salarySharePct}% of outflow came from salary/payroll.`);
  }

  if (top1) {
    bullets.push(`Top outflow bucket: ${top1.bucket} (${formatInr(top1.amount)}).`);
  }

  if (top2) {
    bullets.push(`Second outflow bucket: ${top2.bucket} (${formatInr(top2.amount)}).`);
  }

  if (
    params.runway.previousMonths !== null &&
    params.runway.currentMonths !== null &&
    params.runway.deltaMonths !== null
  ) {
    bullets.push(
      `Runway moved from ${params.runway.previousMonths} to ${params.runway.currentMonths} months (${params.runway.deltaMonths} change).`
    );
  }

  if (params.alerts.openCount > 0) {
    bullets.push(
      `${params.alerts.openCount} open finance alert(s) may be amplifying cash pressure.`
    );
  }

  const suggestion =
    params.breakdown.inventorySharePct >= 40
      ? "Reduce vendor advance and stagger inventory purchases against confirmed inflows."
      : params.breakdown.salarySharePct >= 20
        ? "Re-time payroll against receivables and reduce non-essential spend this cycle."
        : "Cut discretionary outflows and tighten payment sequencing to preserve runway.";

  const headline =
    dropAmount > 0
      ? `Cash dropped ${formatInr(dropAmount)} this month.`
      : `Cash is up ${formatInr(Math.abs(params.cash.monthDelta))} this month.`;

  return {
    headline,
    bullets: bullets.slice(0, 5),
    suggestion
  };
}

function computeConfidenceScore(params: {
  cash: CashBalanceOutput;
  breakdown: ExpenseBreakdownOutput;
  compare: CompareOutput;
  runway: RunwaySummary;
  alerts: AlertsSummary;
}): number {
  let score = 0.55;

  if (Number.isFinite(params.cash.currentCash) && Number.isFinite(params.cash.previousCash)) {
    score += 0.1;
  }

  if (params.breakdown.contributors.length >= 3) {
    score += 0.1;
  } else if (params.breakdown.contributors.length > 0) {
    score += 0.05;
  } else {
    score -= 0.1;
  }

  if (
    Number.isFinite(params.compare.currentMonth.inflow) &&
    Number.isFinite(params.compare.currentMonth.outflow) &&
    Number.isFinite(params.compare.previousMonth.inflow) &&
    Number.isFinite(params.compare.previousMonth.outflow)
  ) {
    score += 0.1;
  }

  if (params.runway.previousMonths !== null && params.runway.currentMonths !== null) {
    score += 0.1;
  } else if (params.runway.currentMonths !== null) {
    score += 0.05;
  }

  if (params.alerts.openCount >= 4) {
    score -= 0.05;
  } else if (params.alerts.openCount <= 1) {
    score += 0.05;
  }

  return normalizeConfidenceScore(score);
}

function buildRiskFlags(params: {
  cash: CashBalanceOutput;
  runway: RunwaySummary;
  alerts: AlertsSummary;
}): ReasoningRiskFlag[] {
  const flags: ReasoningRiskFlag[] = params.alerts.topAlerts.map((alert) => ({
    code: alert.type,
    severity: alert.severity,
    title: alert.title,
    detail: alert.body ?? "Open risk flagged by alert engine."
  }));

  if (params.runway.currentMonths !== null && params.runway.currentMonths < 3) {
    flags.push({
      code: "cash_runway_warning",
      severity: params.runway.currentMonths < 1.5 ? "critical" : "high",
      title: "Cash runway tightening",
      detail: `Projected runway is ${params.runway.currentMonths} month(s).`
    });
  }

  if (
    params.cash.monthDrop > 0 &&
    params.cash.previousCash > 0 &&
    params.cash.monthDrop / params.cash.previousCash >= 0.15
  ) {
    flags.push({
      code: "cash_drop_spike",
      severity: "high",
      title: "Material monthly cash drop",
      detail: `${round2((params.cash.monthDrop / params.cash.previousCash) * 100)}% drop vs previous month.`
    });
  }

  const deduped = new Map<string, ReasoningRiskFlag>();
  for (const flag of flags) {
    const key = `${flag.code}:${flag.title.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, flag);
    }
  }

  return Array.from(deduped.values()).slice(0, 8);
}

function buildReasoningChain(params: {
  userQuery: string;
  workspaceId: string;
  period: CashDropPeriod;
  cash: CashBalanceOutput;
  breakdown: ExpenseBreakdownOutput;
  compare: CompareOutput;
  alerts: AlertsSummary;
  reasoning: CashDropReasoning;
  riskFlags: ReasoningRiskFlag[];
  confidenceScore: number;
  baseTimestamp: Date;
}): CashDropReasoningChain {
  const steps: ReasoningTraceStep[] = [
    {
      user_query: params.userQuery,
      tools_called: ["get_cash_balance"],
      inputs: {
        workspace_id: params.workspaceId,
        current_as_of_exclusive: params.period.currentEndExclusive,
        previous_as_of_exclusive: params.period.previousEndExclusive
      },
      outputs: {
        current_cash: params.cash.currentCash,
        previous_cash: params.cash.previousCash,
        month_delta: params.cash.monthDelta,
        month_drop: params.cash.monthDrop
      },
      timestamp: offsetTimestamp(params.baseTimestamp, 0),
      confidence_score: params.confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["get_expense_breakdown"],
      inputs: {
        workspace_id: params.workspaceId,
        period_start: params.period.currentStart,
        period_end_exclusive: params.period.currentEndExclusive
      },
      outputs: {
        total_outflow: params.breakdown.totalOutflow,
        top_contributors: params.breakdown.contributors.slice(0, 3),
        inventory_share_pct: params.breakdown.inventorySharePct,
        salary_share_pct: params.breakdown.salarySharePct
      },
      timestamp: offsetTimestamp(params.baseTimestamp, 200),
      confidence_score: params.confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["compare_with_last_month"],
      inputs: {
        workspace_id: params.workspaceId,
        current_month: params.period.currentMonth
      },
      outputs: {
        current_month: params.compare.currentMonth,
        previous_month: params.compare.previousMonth,
        net_delta: params.compare.netDelta
      },
      timestamp: offsetTimestamp(params.baseTimestamp, 400),
      confidence_score: params.confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: ["alert_engine_check"],
      inputs: {
        workspace_id: params.workspaceId,
        alert_window: "open"
      },
      outputs: {
        open_alert_count: params.alerts.openCount,
        top_alerts: params.alerts.topAlerts
      },
      timestamp: offsetTimestamp(params.baseTimestamp, 600),
      confidence_score: params.confidenceScore
    },
    {
      user_query: params.userQuery,
      tools_called: [
        "get_cash_balance",
        "get_expense_breakdown",
        "compare_with_last_month",
        "alert_engine_check"
      ],
      inputs: {
        synthesis: "deterministic engine outputs"
      },
      outputs: {
        headline: params.reasoning.headline,
        bullets: params.reasoning.bullets,
        suggestion: params.reasoning.suggestion,
        risk_flags: params.riskFlags
      },
      timestamp: offsetTimestamp(params.baseTimestamp, 800),
      confidence_score: params.confidenceScore
    }
  ];

  return {
    multi_step_reasoning_chain: steps,
    tool_chaining: buildToolChainingFromSteps(steps),
    confidence_score: params.confidenceScore,
    risk_flags: params.riskFlags
  };
}

export async function analyzeCashDrop(params: {
  workspaceId: string;
  query: string;
  now?: Date;
  client?: PoolClient;
}): Promise<CashDropAnalysis> {
  const db = params.client ?? getDbPool();
  const now = params.now ?? new Date();
  const currentMonth = resolveMonthWindow(now);
  const previousMonth = resolvePreviousMonthWindow(currentMonth);

  const [currentCash, previousCash, contributors, compare, alerts] = await Promise.all([
    queryCashBalanceAt({
      db,
      workspaceId: params.workspaceId,
      asOfExclusive: currentMonth.endExclusive
    }),
    queryCashBalanceAt({
      db,
      workspaceId: params.workspaceId,
      asOfExclusive: previousMonth.endExclusive
    }),
    queryExpenseBreakdown({
      db,
      workspaceId: params.workspaceId,
      start: currentMonth.start,
      endExclusive: currentMonth.endExclusive
    }),
    queryFlowComparison({
      db,
      workspaceId: params.workspaceId,
      current: currentMonth,
      previous: previousMonth
    }),
    queryOpenAlerts({
      db,
      workspaceId: params.workspaceId
    })
  ]);

  const monthDelta = round2(currentCash - previousCash);
  const monthDrop = monthDelta < 0 ? round2(Math.abs(monthDelta)) : 0;

  const totalOutflow = round2(contributors.reduce((sum, item) => sum + item.amount, 0));
  const inventorySharePct = computeThemeShare(contributors, [
    "inventory",
    "stock",
    "purchase",
    "procurement"
  ]);
  const salarySharePct = computeThemeShare(contributors, ["salary", "payroll", "wages"]);

  const [previousRunway, currentRunway] = await Promise.all([
    queryRunwayAt({
      db,
      workspaceId: params.workspaceId,
      cutoffExclusive: previousMonth.endExclusive,
      cashBalance: previousCash
    }),
    queryRunwayAt({
      db,
      workspaceId: params.workspaceId,
      cutoffExclusive: currentMonth.endExclusive,
      cashBalance: currentCash
    })
  ]);

  const runwayDelta =
    previousRunway !== null && currentRunway !== null
      ? round2(currentRunway - previousRunway)
      : null;

  const cashOutput: CashBalanceOutput = {
    currentCash,
    previousCash,
    monthDelta,
    monthDrop
  };

  const expenseOutput: ExpenseBreakdownOutput = {
    totalOutflow,
    contributors,
    inventorySharePct,
    salarySharePct
  };

  const runway: RunwaySummary = {
    previousMonths: previousRunway,
    currentMonths: currentRunway,
    deltaMonths: runwayDelta
  };

  const reasoning = buildReasoning({
    cash: cashOutput,
    breakdown: expenseOutput,
    runway,
    alerts
  });
  const confidenceScore = computeConfidenceScore({
    cash: cashOutput,
    breakdown: expenseOutput,
    compare,
    runway,
    alerts
  });
  const riskFlags = buildRiskFlags({
    cash: cashOutput,
    runway,
    alerts
  });

  const period: CashDropPeriod = {
    currentMonth: currentMonth.key,
    currentStart: currentMonth.start.toISOString(),
    currentEndExclusive: currentMonth.endExclusive.toISOString(),
    previousStart: previousMonth.start.toISOString(),
    previousEndExclusive: previousMonth.endExclusive.toISOString()
  };

  const toolCalls: CashDropToolCalls = [
    {
      tool: "get_cash_balance",
      output: cashOutput
    },
    {
      tool: "get_expense_breakdown",
      output: expenseOutput
    },
    {
      tool: "compare_with_last_month",
      output: compare
    },
    {
      tool: "alert_engine_check",
      output: alerts
    }
  ];

  const generatedAtDate = new Date();
  const generatedAt = generatedAtDate.toISOString();
  const reasoningChain = buildReasoningChain({
    userQuery: params.query,
    workspaceId: params.workspaceId,
    period,
    cash: cashOutput,
    breakdown: expenseOutput,
    compare,
    alerts,
    reasoning,
    riskFlags,
    confidenceScore,
    baseTimestamp: generatedAtDate
  });

  const boundary = createFinanceBoundaryEnvelope({
    question: params.query,
    computed: {
      period,
      toolCalls,
      generatedAt
    },
    facts: [reasoning.headline, ...reasoning.bullets, `confidence_score:${confidenceScore}`],
    context: alerts.topAlerts.map(
      (alert) => `${alert.severity.toUpperCase()} ${alert.type}: ${alert.title}`
    ),
    suggestions: [reasoning.suggestion]
  });

  return {
    query: params.query,
    period,
    toolCalls,
    reasoning,
    reasoningChain,
    boundary,
    generatedAt
  };
}
