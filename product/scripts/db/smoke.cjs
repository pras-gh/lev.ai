#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const CANDIDATE_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "SUPABASE_DB_URL"
];

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) {
    return;
  }

  const content = fs.readFileSync(filepath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function resolveConnectionString() {
  for (const key of CANDIDATE_KEYS) {
    const value = process.env[key];
    if (value && value.trim()) {
      return { key, value };
    }
  }

  throw new Error(`Missing Postgres URL. Set one of: ${CANDIDATE_KEYS.join(", ")}`);
}

function shouldUseSsl(connectionString) {
  if (process.env.DATABASE_SSL === "disable") {
    return false;
  }

  return !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
}

async function run() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));

  const { key, value: connectionString } = resolveConnectionString();
  const ssl = shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false;
  const client = new Client({ connectionString, ssl });

  console.log(`Connecting with ${key}`);
  await client.connect();

  try {
    const businessName = "Smoke Test Business";

    const business = await client.query(
      `
      INSERT INTO businesses (name, legal_name)
      VALUES ($1, $2)
      ON CONFLICT (name)
      DO UPDATE SET updated_at = NOW()
      RETURNING id, name
      `,
      [businessName, "Smoke Test Business Pvt Ltd"]
    );

    const businessId = business.rows[0].id;

    const category = await client.query(
      `
      INSERT INTO categories (business_id, name, kind, description)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (business_id, name)
      DO UPDATE SET updated_at = NOW()
      RETURNING id, name
      `,
      [businessId, "General Expense", "expense", "Smoke test category"]
    );

    const categoryId = category.rows[0].id;

    const insertedTransaction = await client.query(
      `
      INSERT INTO transactions (
        business_id,
        category_id,
        external_ref,
        direction,
        amount_minor,
        currency_code,
        occurred_at,
        description,
        counterparty,
        source,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10::jsonb)
      RETURNING id, business_id, category_id, direction, amount_minor, currency_code, occurred_at, description
      `,
      [
        businessId,
        categoryId,
        `smoke-${Date.now()}`,
        "debit",
        159900,
        "INR",
        "Smoke transaction",
        "Demo Vendor",
        "manual",
        JSON.stringify({ from: "db:smoke" })
      ]
    );

    const queried = await client.query(
      `
      SELECT
        t.id,
        t.business_id,
        t.category_id,
        c.name AS category_name,
        t.direction,
        t.amount_minor,
        t.currency_code,
        t.occurred_at,
        t.description,
        t.created_at
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.business_id = $1
      ORDER BY t.occurred_at DESC
      LIMIT 5
      `,
      [businessId]
    );

    console.log("Inserted transaction:");
    console.log(insertedTransaction.rows[0]);
    console.log("Recent queried transactions (top 5):");
    console.log(queried.rows);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
