import { NextRequest, NextResponse } from "next/server";
import { getTransactionById } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error("Boolean query params must be true or false");
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

  if (message.includes("required") || message.includes("must be") || message.includes("Boolean")) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const transactionId = toPositiveInt(id, "id");
    const businessIdRaw = request.nextUrl.searchParams.get("businessId");

    if (!businessIdRaw) {
      return badRequest("Missing required query param: businessId");
    }

    const businessId = toPositiveInt(businessIdRaw, "businessId");
    const includeDeleted = parseBoolean(request.nextUrl.searchParams.get("includeDeleted"));
    const includeHidden = parseBoolean(request.nextUrl.searchParams.get("includeHidden"));

    const transaction = await getTransactionById({
      transactionId,
      businessId,
      includeDeleted,
      includeHidden
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get transaction";
    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
