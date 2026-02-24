import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  parsePagination,
  readScopeFromBody,
  readScopeFromSearchParams,
  toOptionalText
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["income", "expense", "asset", "liability"]);

type CategoryListRow = {
  id: number;
  public_id: string;
  workspace_id: string;
  business_id: number;
  name: string;
  kind: string;
  type: string;
  description: string | null;
  transaction_count: string;
  created_at: string;
  updated_at: string;
};

function mapCategoryTypeToKind(type: string): string {
  if (type === "income") {
    return "income";
  }

  if (type === "expense") {
    return "expense";
  }

  return "other";
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(params)
    });
    const { page, pageSize } = parsePagination(params);
    const type = params.get("type")?.trim().toLowerCase();
    const q = params.get("q")?.trim();

    if (type && !ALLOWED_TYPES.has(type)) {
      return badRequest("type must be one of: income, expense, asset, liability");
    }

    const filters: string[] = ["c.workspace_id = $1::uuid"];
    const values: Array<string | number> = [scope.workspaceId];
    let index = 2;

    if (type) {
      values.push(type);
      filters.push(`c.type = $${index}`);
      index += 1;
    }

    if (q) {
      values.push(`%${q}%`);
      filters.push(`(c.name ILIKE $${index} OR COALESCE(c.description, '') ILIKE $${index})`);
      index += 1;
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;
    const db = getDbPool();

    const totalResult = await db.query<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM categories c
      ${whereClause}
      `,
      values
    );

    const offset = (page - 1) * pageSize;
    const dataValues = [...values, pageSize, offset];
    const rowsResult = await db.query<CategoryListRow>(
      `
      SELECT
        c.id,
        c.public_id,
        c.workspace_id::text,
        c.business_id,
        c.name,
        c.kind,
        c.type,
        c.description,
        COUNT(t.id)::text AS transaction_count,
        c.created_at,
        c.updated_at
      FROM categories c
      LEFT JOIN transactions t
        ON t.category_id = c.id
       AND t.workspace_id = c.workspace_id
       AND t.is_hidden = FALSE
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.name ASC, c.id ASC
      LIMIT $${index}
      OFFSET $${index + 1}
      `,
      dataValues
    );

    const total = Number(totalResult.rows[0]?.total ?? "0");

    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      categories: rowsResult.rows
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list categories";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found") ||
      message.includes("type must be")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
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
    const name = toOptionalText(payload.name);
    const type = (toOptionalText(payload.type) ?? "expense").toLowerCase();
    const description = toOptionalText(payload.description) ?? null;

    if (!name) {
      return badRequest("name is required");
    }

    if (!ALLOWED_TYPES.has(type)) {
      return badRequest("type must be one of: income, expense, asset, liability");
    }

    const kind = mapCategoryTypeToKind(type);
    const db = getDbPool();

    const result = await db.query(
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
      RETURNING *
      `,
      [scope.businessId, scope.workspaceId, name, kind, type, description]
    );

    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("required") ||
      message.includes("type must be") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
