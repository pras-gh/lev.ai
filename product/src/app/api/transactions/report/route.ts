import { NextRequest, NextResponse } from "next/server";
import {
  getTransactionReportingSummary,
  type ReportingPolicy
} from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("must be") || message.includes("policy")) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const businessIdRaw = params.get("businessId");

  if (!businessIdRaw) {
    return badRequest("Missing required query param: businessId");
  }

  try {
    const businessId = Number(businessIdRaw);
    const policy = (params.get("policy") ?? "strict_ledger") as ReportingPolicy;
    const fromDate = params.get("fromDate") ?? undefined;
    const toDate = params.get("toDate") ?? undefined;

    const summary = await getTransactionReportingSummary({
      businessId,
      policy,
      fromDate,
      toDate
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build report";
    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
