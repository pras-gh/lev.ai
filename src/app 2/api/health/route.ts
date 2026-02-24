import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const databaseTime = await pingDatabase();

    return NextResponse.json({
      status: "ok",
      service: "core-sell-pro",
      database: {
        status: "connected",
        time: databaseTime
      },
      responseTimeMs: Date.now() - startedAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        status: "degraded",
        service: "core-sell-pro",
        database: {
          status: "disconnected",
          error: message
        },
        responseTimeMs: Date.now() - startedAt
      },
      { status: 503 }
    );
  }
}
