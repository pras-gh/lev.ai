import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  readScopeFromBody,
  readScopeFromSearchParams
} from "@/lib/api-utils";
import { getAuthErrorStatus, resolveAuthorizedScope } from "@/lib/api-auth";
import {
  appendConversationMemory,
  getConversationMemory
} from "@/lib/memory/service";
import type { ConversationMemoryAppend } from "@/lib/memory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAppendPayload(payload: Record<string, unknown>): ConversationMemoryAppend {
  const next: ConversationMemoryAppend = {};

  if (payload.query !== undefined) {
    if (typeof payload.query !== "string") {
      throw new Error("query must be a string");
    }

    next.query = payload.query;
  }

  if (payload.toolOutput !== undefined) {
    const rawToolOutput = payload.toolOutput;
    if (!rawToolOutput || typeof rawToolOutput !== "object" || Array.isArray(rawToolOutput)) {
      throw new Error("toolOutput must be an object with tool and output");
    }

    const tool = (rawToolOutput as Record<string, unknown>).tool;
    const output = (rawToolOutput as Record<string, unknown>).output;
    if (typeof tool !== "string" || typeof output !== "string") {
      throw new Error("toolOutput.tool and toolOutput.output must be strings");
    }

    next.toolOutput = {
      tool,
      output
    };
  }

  return next;
}

function hasAppendData(value: ConversationMemoryAppend): boolean {
  return Boolean(value.query || value.toolOutput);
}

export async function GET(request: NextRequest) {
  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromSearchParams(request.nextUrl.searchParams)
    });

    const memory = await getConversationMemory({
      workspaceId: scope.workspaceId,
      userId: scope.userId
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      userId: scope.userId,
      memory
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read conversation memory";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("must be")
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
    body = {};
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("Body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;

  try {
    const scope = await resolveAuthorizedScope({
      request,
      scope: readScopeFromBody(payload)
    });

    const append = parseAppendPayload(payload);
    if (!hasAppendData(append)) {
      return badRequest(
        "Provide query or toolOutput when appending conversation memory"
      );
    }

    const memory = await appendConversationMemory({
      workspaceId: scope.workspaceId,
      userId: scope.userId,
      append
    });

    return NextResponse.json({
      workspaceId: scope.workspaceId,
      userId: scope.userId,
      memory
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to write conversation memory";
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: message }, { status: authStatus });
    }

    const status =
      message.includes("Provide at least one scope identifier") ||
      message.includes("must be")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
