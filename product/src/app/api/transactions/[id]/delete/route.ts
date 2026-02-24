import { NextRequest, NextResponse } from "next/server";
import { setTransactionVisibility, type ActorType } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

function toPositiveInt(raw: unknown, fieldName: string): number {
  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value;
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message.includes("not found")) {
    return 404;
  }

  if (message.includes("required") || message.includes("must be")) {
    return 400;
  }

  return 500;
}

async function softDelete(request: NextRequest, params: RouteParams["params"]) {
  const { id } = await params;

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
    const transactionId = toPositiveInt(id, "id");
    const businessId = toPositiveInt(payload.businessId, "businessId");
    const reason = typeof payload.reason === "string" ? payload.reason : "";
    const actorType = payload.actorType as ActorType | undefined;
    const actorId = typeof payload.actorId === "string" ? payload.actorId : undefined;

    const transaction = await setTransactionVisibility({
      transactionId,
      businessId,
      hidden: true,
      reason,
      actorType,
      actorId
    });

    return NextResponse.json({
      message: "Transaction soft-deleted for UI hiding. Ledger totals are unchanged.",
      transaction
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to soft-delete transaction";
    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return softDelete(request, context.params);
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return softDelete(request, context.params);
}
