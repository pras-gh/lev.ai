#!/usr/bin/env node

import process from "node:process";
import { Client } from "pg";

const BASE_URL = (process.env.APP_BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);
const ACCESS_TOKEN =
  process.env.ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.E2E_ACCESS_TOKEN ||
  "";
const WORKSPACE_ID = (process.env.WORKSPACE_ID || "").trim();
const BUSINESS_ID = (process.env.BUSINESS_ID || "").trim();
const MONTH = (process.env.MONTH || new Date().toISOString().slice(0, 7)).trim();
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();

if (!ACCESS_TOKEN) {
  console.error(
    "Missing ACCESS_TOKEN (or SUPABASE_ACCESS_TOKEN / E2E_ACCESS_TOKEN)."
  );
  process.exit(1);
}

if (!WORKSPACE_ID && !BUSINESS_ID) {
  console.error("Set WORKSPACE_ID or BUSINESS_ID.");
  process.exit(1);
}

if (!/^\d{4}-\d{2}$/.test(MONTH)) {
  console.error("MONTH must be YYYY-MM.");
  process.exit(1);
}

function buildScopeQuery() {
  if (WORKSPACE_ID) {
    return `workspaceId=${encodeURIComponent(WORKSPACE_ID)}`;
  }

  return `businessId=${encodeURIComponent(BUSINESS_ID)}`;
}

function buildScopeBody() {
  if (WORKSPACE_ID) {
    return { workspaceId: WORKSPACE_ID };
  }

  return { businessId: Number(BUSINESS_ID) };
}

async function api(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof payload.error === "string"
        ? payload.error
        : `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`${path} failed: ${message}`);
  }

  return payload;
}

async function readDbSnapshot() {
  if (!DATABASE_URL || !WORKSPACE_ID) {
    return null;
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl:
      DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    const result = await client.query(
      `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM transactions
          WHERE workspace_id = $1::uuid
            AND is_hidden = FALSE
            AND status <> 'pending'
        ) AS tx_total,
        (
          SELECT COUNT(*)::int
          FROM transactions
          WHERE workspace_id = $1::uuid
            AND is_hidden = FALSE
            AND status <> 'pending'
            AND category_id IS NOT NULL
        ) AS tx_categorized,
        (
          SELECT COUNT(*)::int
          FROM transactions
          WHERE workspace_id = $1::uuid
            AND is_hidden = FALSE
            AND status <> 'pending'
            AND matched = TRUE
        ) AS tx_matched,
        (
          SELECT COUNT(*)::int
          FROM alerts
          WHERE workspace_id = $1::uuid
            AND status = 'open'
        ) AS open_alerts
      `,
      [WORKSPACE_ID]
    );

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

function must(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const scopeQuery = buildScopeQuery();
  const scopeBody = buildScopeBody();
  console.log("Smoke test starting...");
  console.log({ baseUrl: BASE_URL, scopeQuery, month: MONTH });

  const beforeDb = await readDbSnapshot();
  const beforeOverview = await api(`/api/metrics/overview?${scopeQuery}&range=MTD`);
  const beforeTx = await api(`/api/transactions?${scopeQuery}&page=1&limit=1`);
  const beforeAlerts = await api(`/api/alerts?${scopeQuery}&status=open&page=1&limit=10`);

  const closeMonth = await api("/api/month-close", {
    method: "POST",
    body: JSON.stringify({
      ...scopeBody,
      month: MONTH,
      sendWhatsAppDigest: false
    })
  });

  const afterOverview = await api(`/api/metrics/overview?${scopeQuery}&range=MTD`);
  const afterTx = await api(`/api/transactions?${scopeQuery}&page=1&limit=1`);
  const afterAlerts = await api(`/api/alerts?${scopeQuery}&status=open&page=1&limit=10`);
  const lineage = await api(
    `/api/reports/monthly/lineage?${scopeQuery}&month=${encodeURIComponent(MONTH)}&metric=revenue&limit=10`
  );
  const afterDb = await readDbSnapshot();

  must(
    typeof closeMonth?.report?.metrics === "object",
    "month-close did not return report metrics"
  );
  must(
    closeMonth?.verification?.checks?.apiRun === true,
    "month-close verification.apiRun is not true"
  );
  must(
    Array.isArray(lineage?.lineage?.transactions),
    "lineage endpoint did not return transactions array"
  );
  must(typeof beforeOverview === "object", "before overview missing");
  must(typeof afterOverview === "object", "after overview missing");
  must(typeof beforeTx?.total === "number", "before tx summary missing total");
  must(typeof afterTx?.total === "number", "after tx summary missing total");
  must(Array.isArray(beforeAlerts?.alerts), "before alerts missing alerts list");
  must(Array.isArray(afterAlerts?.alerts), "after alerts missing alerts list");

  if (beforeDb && afterDb) {
    must(
      typeof afterDb.tx_total === "number" &&
        typeof afterDb.tx_categorized === "number",
      "DB snapshot shape invalid"
    );
  }

  const result = {
    checks: {
      apiRun: closeMonth?.verification?.checks?.apiRun ?? false,
      dbTouched: closeMonth?.verification?.checks?.dbTouched ?? null,
      alertsEvaluated: closeMonth?.verification?.checks?.alertsEvaluated ?? false,
      reportGenerated: closeMonth?.verification?.checks?.reportGenerated ?? false
    },
    verification: closeMonth?.verification ?? null,
    summary: {
      beforeTotalTransactions: beforeTx.total,
      afterTotalTransactions: afterTx.total,
      beforeOpenAlerts: beforeAlerts.total ?? beforeAlerts.alerts.length,
      afterOpenAlerts: afterAlerts.total ?? afterAlerts.alerts.length,
      lineageRows: lineage?.lineage?.transactions?.length ?? 0
    },
    dbSnapshot: beforeDb && afterDb ? { before: beforeDb, after: afterDb } : null
  };

  console.log("PASS");
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error("FAIL");
  console.error(error?.message || error);
  process.exit(1);
});
