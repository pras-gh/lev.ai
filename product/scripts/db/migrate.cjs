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

  const migrationsDir = path.join(cwd, "db", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No SQL migrations found in db/migrations");
    return;
  }

  console.log(`Connecting with ${key}`);
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      const id = file;
      const alreadyApplied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE id = $1",
        [id]
      );

      if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.log(`Applying ${file}...`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
        await client.query("COMMIT");
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Migrations complete");
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
