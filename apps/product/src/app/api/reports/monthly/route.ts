import { NextRequest, NextResponse } from "next/server";
import { badRequest, readScopeFromSearchParams } from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  buildMonthlySummaryHtml,
  computeMonthlySummary
} from "@/lib/monthly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutputFormat = "json" | "html" | "pdf";

function parseFormat(raw: string | null): OutputFormat {
  if (!raw || raw.trim() === "") {
    return "json";
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "json" || normalized === "html" || normalized === "pdf") {
    return normalized;
  }

  throw new Error("format must be one of: json, html, pdf");
}

function mapErrorToStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (
    message.includes("month ") ||
    message.includes("format ") ||
    message.includes("Provide at least one scope identifier") ||
    message.includes("not found") ||
    message.includes("must be")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  let format: OutputFormat;

  try {
    format = parseFormat(params.get("format"));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid format");
  }

  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(params)
    });
    const month = params.get("month") ?? undefined;
    const gstRateGuessRaw = params.get("gstRateGuess");
    let gstRateGuessPct: number | undefined;
    if (gstRateGuessRaw && gstRateGuessRaw.trim() !== "") {
      const parsed = Number(gstRateGuessRaw);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        return badRequest("gstRateGuess must be a number between 0 and 100");
      }
      gstRateGuessPct = parsed;
    }
    const summary = await computeMonthlySummary({
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      month,
      gstRateGuessPct
    });

    if (format === "json") {
      return NextResponse.json({
        workspaceId: scope.workspaceId,
        businessId: scope.businessId,
        ...summary
      });
    }

    const html = buildMonthlySummaryHtml({
      summary,
      workspaceId: scope.workspaceId,
      businessId: scope.businessId,
      autoPrint: format === "pdf"
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="monthly-summary-${summary.month}.html"`
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate monthly summary";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}
