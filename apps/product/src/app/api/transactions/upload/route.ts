import { NextRequest, NextResponse } from "next/server";
import {
  readScopeFromBody,
  toOptionalBoolean,
  toOptionalPositiveInt,
  toOptionalUuid
} from "@/lib/api-utils";
import type { ApiScopeInput } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import { parseAndInsertBankCsv } from "@/lib/bankCsvIngest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadPayload = {
  scope: ApiScopeInput;
  csv: string;
  source?: string;
  dryRun?: boolean;
  chunkSize?: number;
};

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function parseUploadPayload(request: NextRequest): Promise<UploadPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const businessIdRaw = form.get("businessId");
    const workspaceIdRaw = form.get("workspaceId");
    const sourceRaw = form.get("source");
    const dryRunRaw = form.get("dryRun");
    const chunkSizeRaw = form.get("chunkSize");
    const csvRaw = form.get("csv");
    const fileRaw = form.get("file");

    const businessId = toOptionalPositiveInt(
      typeof businessIdRaw === "string" ? businessIdRaw : undefined,
      "businessId"
    );
    const workspaceId = toOptionalUuid(
      typeof workspaceIdRaw === "string" ? workspaceIdRaw : undefined,
      "workspaceId"
    );

    if (!businessId && !workspaceId) {
      throw new Error("Provide at least one scope identifier: workspaceId or businessId");
    }

    let csv = typeof csvRaw === "string" ? csvRaw : "";
    if (!csv && fileRaw instanceof File) {
      csv = await fileRaw.text();
    }

    if (!csv.trim()) {
      throw new Error("CSV payload is empty. Provide `file` or `csv` in multipart form data");
    }

    return {
      scope: {
        businessId,
        workspaceId
      },
      csv,
      source: toOptionalString(sourceRaw),
      dryRun: toOptionalBoolean(dryRunRaw, "dryRun"),
      chunkSize: toOptionalPositiveInt(chunkSizeRaw, "chunkSize")
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    throw new Error("Body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;
  const scope = readScopeFromBody(payload);
  const csv = typeof payload.csv === "string" ? payload.csv : "";

  if (!csv.trim()) {
    throw new Error("csv must be a non-empty string");
  }

  return {
    scope,
    csv,
    source: toOptionalString(payload.source),
    dryRun: toOptionalBoolean(payload.dryRun, "dryRun"),
    chunkSize: toOptionalPositiveInt(payload.chunkSize, "chunkSize")
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseUploadPayload(request);
    const scope = await resolveAuthorizedScope({
      request,
      scope: payload.scope
    });

    const result = await parseAndInsertBankCsv({
      businessId: scope.businessId,
      csv: payload.csv,
      source: payload.source,
      chunkSize: payload.chunkSize,
      dryRun: payload.dryRun
    });

    return NextResponse.json({
      parsed: {
        headers: result.parsed.headers,
        totalRows: result.parsed.totalRows,
        normalizedRows: result.parsed.transactions.length,
        rejectedRows: result.parsed.rejectedRows.length
      },
      rejectedPreview: result.parsed.rejectedRows.slice(0, 20),
      insert: result.insert
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload transactions CSV";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("must be") ||
      message.includes("Invalid") ||
      message.includes("CSV") ||
      message.includes("csv") ||
      message.includes("Provide at least one scope identifier") ||
      message.includes("not found")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
