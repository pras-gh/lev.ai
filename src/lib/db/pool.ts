import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

type DbPingResult = {
  now: string;
};

let pool: Pool | null = null;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function resolveConnectionString(): string {
  const candidateKeys = [
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "NEON_DATABASE_URL",
    "SUPABASE_DB_URL"
  ] as const;

  for (const key of candidateKeys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value;
    }
  }

  throw new Error(
    `No Postgres connection string found. Set one of: ${candidateKeys.join(", ")}`
  );
}

function shouldUseSsl(connectionString: string): boolean {
  if (process.env.DATABASE_SSL === "disable") {
    return false;
  }

  return !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
}

export function getDbPool(): Pool {
  const connectionString = resolveConnectionString();

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

export async function pingDatabase(): Promise<string> {
  const dbPool = getDbPool();
  const result = await dbPool.query<DbPingResult>("select now()::text as now");

  if (!result.rows[0]?.now) {
    throw new Error("Database responded without timestamp");
  }

  return result.rows[0].now;
}
