import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  toOptionalPositiveInt,
  toOptionalText
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";
import { forwardAuthHeaders, runCloseMonthPipeline } from "@/lib/month-close";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DemoCategory = {
  name: string;
  kind: "income" | "expense" | "other";
  type: "income" | "expense" | "asset" | "liability";
  description: string;
};

type SyncProvider = "hdfc" | "razorpay" | "stripe" | "whatsapp";

const INTERNAL_ROLES = new Set(["owner", "admin"]);
const DEFAULT_SEED_PROVIDERS: readonly SyncProvider[] = [
  "hdfc",
  "razorpay",
  "stripe"
];

const DEMO_CATEGORIES: readonly DemoCategory[] = [
  {
    name: "revenue",
    kind: "income",
    type: "income",
    description: "Customer collections and settlement inflows"
  },
  {
    name: "tax",
    kind: "expense",
    type: "expense",
    description: "GST, TDS, and statutory tax outflows"
  },
  {
    name: "payroll",
    kind: "expense",
    type: "expense",
    description: "Salary, payroll, and employee benefits"
  },
  {
    name: "fixed cost",
    kind: "expense",
    type: "expense",
    description: "Recurring fixed operating costs"
  },
  {
    name: "marketing",
    kind: "expense",
    type: "expense",
    description: "Ad spend and growth campaigns"
  },
  {
    name: "saas",
    kind: "expense",
    type: "expense",
    description: "Software subscriptions and cloud tooling"
  },
  {
    name: "logistics",
    kind: "expense",
    type: "expense",
    description: "Shipping and fulfillment operations"
  },
  {
    name: "rent/utilities",
    kind: "expense",
    type: "expense",
    description: "Office rent, electricity, and internet"
  }
];

function isInternalDemoToolsEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const flag = (process.env.ENABLE_INTERNAL_DEMO_TOOLS ?? "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

function parseProviders(value: unknown): SyncProvider[] {
  if (value === undefined || value === null || value === "") {
    return [...DEFAULT_SEED_PROVIDERS];
  }

  const asArray = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((entry) => entry.trim());

  const unique = new Set<SyncProvider>();
  for (const candidate of asArray) {
    const normalized = String(candidate).trim().toLowerCase();
    if (
      normalized === "hdfc" ||
      normalized === "razorpay" ||
      normalized === "stripe" ||
      normalized === "whatsapp"
    ) {
      unique.add(normalized);
      continue;
    }

    throw new Error(
      "providers must include only: hdfc, razorpay, stripe, whatsapp"
    );
  }

  if (unique.size === 0) {
    throw new Error("providers must include at least one provider");
  }

  return [...unique];
}

async function ensureDemoCategories(params: {
  workspaceId: string;
  businessId: number;
}): Promise<number> {
  const db = getDbPool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const category of DEMO_CATEGORIES) {
      await client.query(
        `
        INSERT INTO categories (
          business_id,
          workspace_id,
          name,
          kind,
          type,
          description
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6)
        ON CONFLICT (business_id, name)
        DO UPDATE
        SET
          workspace_id = EXCLUDED.workspace_id,
          kind = EXCLUDED.kind,
          type = EXCLUDED.type,
          description = EXCLUDED.description,
          updated_at = NOW()
        `,
        [
          params.businessId,
          params.workspaceId,
          category.name,
          category.kind,
          category.type,
          category.description
        ]
      );
    }

    await client.query("COMMIT");
    return DEMO_CATEGORIES.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  return fallback;
}

async function runSyncSeed(params: {
  request: NextRequest;
  workspaceId: string;
  businessId: number;
  provider: SyncProvider;
  rowCount: number;
}): Promise<{
  provider: SyncProvider;
  ok: boolean;
  rowsInserted: number;
  message: string;
}> {
  const response = await fetch(new URL("/api/integrations/sync", params.request.url), {
    method: "POST",
    headers: forwardAuthHeaders(params.request),
    cache: "no-store",
    body: JSON.stringify({
      workspaceId: params.workspaceId,
      businessId: params.businessId,
      provider: params.provider,
      rowCount: params.rowCount
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; job?: { rowsInserted?: number } }
    | { error?: string }
    | null;

  if (!response.ok) {
    return {
      provider: params.provider,
      ok: false,
      rowsInserted: 0,
      message: parseErrorMessage(payload, "Sync failed")
    };
  }

  const rowsInserted =
    payload &&
    typeof payload === "object" &&
    "job" in payload &&
    payload.job &&
    typeof payload.job === "object" &&
    "rowsInserted" in payload.job
      ? Number((payload.job as { rowsInserted?: unknown }).rowsInserted ?? 0)
      : 0;
  const message =
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
      ? payload.message
      : "Sync completed";

  return {
    provider: params.provider,
    ok: true,
    rowsInserted,
    message
  };
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (
    message.includes("providers ") ||
    message.includes("rowCount ") ||
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
  if (!isInternalDemoToolsEnabled()) {
    return NextResponse.json(
      { error: "Demo workspace seed is disabled in this environment" },
      { status: 403 }
    );
  }

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

    if (!INTERNAL_ROLES.has(scope.workspaceRole.toLowerCase())) {
      return NextResponse.json(
        { error: "Only owner/admin can seed demo workspace data" },
        { status: 403 }
      );
    }

    const rowCountPerProvider =
      toOptionalPositiveInt(payload.rowCountPerProvider, "rowCountPerProvider") ?? 8;
    if (rowCountPerProvider < 1 || rowCountPerProvider > 25) {
      return badRequest("rowCountPerProvider must be between 1 and 25");
    }

    const providers = parseProviders(payload.providers);
    const month = toOptionalText(payload.month) ?? undefined;

    const categoriesEnsured = await ensureDemoCategories({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId
    });

    const syncResults: Array<{
      provider: SyncProvider;
      ok: boolean;
      rowsInserted: number;
      message: string;
    }> = [];

    for (const provider of providers) {
      const result = await runSyncSeed({
        request,
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        provider,
        rowCount: rowCountPerProvider
      });
      syncResults.push(result);
    }

    const closeMonth = await runCloseMonthPipeline({
      request,
      scope: {
        workspaceId: scope.workspaceId,
        businessId: scope.businessId
      },
      options: {
        month,
        sendWhatsAppDigest: false
      }
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      internalMode: true,
      categoriesEnsured,
      rowCountPerProvider,
      providersSeeded: providers,
      syncResults,
      closeMonth
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed workspace";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
