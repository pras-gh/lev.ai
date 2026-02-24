import type { QueryResult, QueryResultRow } from "pg";
import { getDbPool } from "@/lib/db/pool";

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  return getDbPool().query<T>(text, values);
}

type WorkspaceLookupRow = {
  id: string;
  business_id: string;
  name: string;
};

export async function getWorkspaceByBusinessId(
  businessId: number
): Promise<WorkspaceLookupRow | null> {
  const result = await dbQuery<WorkspaceLookupRow>(
    `
    SELECT id::text, business_id::text, name
    FROM workspaces
    WHERE business_id = $1
    LIMIT 1
    `,
    [businessId]
  );

  return result.rows[0] ?? null;
}
