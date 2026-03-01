import type { NextRequest } from "next/server";
import { writeAuditLogSafe } from "@/lib/audit-log";
import type { ReasoningTrace } from "@/lib/reasoning-trace";
import { toUniqueTools } from "@/lib/reasoning-trace";

function getClientIp(request: NextRequest): string | null {
  const raw = request.headers.get("x-forwarded-for")?.trim();
  if (!raw) {
    return null;
  }

  const first = raw.split(",")[0]?.trim();
  return first || null;
}

export async function writeReasoningAudit(params: {
  request: NextRequest;
  workspaceId: string;
  businessId: number;
  endpoint: string;
  method: string;
  userQuery: string;
  trace: ReasoningTrace;
  outputs: Record<string, unknown>;
  generatedAt: string;
}): Promise<void> {
  await writeAuditLogSafe({
    workspaceId: params.workspaceId,
    businessId: params.businessId,
    actorType: "system",
    actorId: params.endpoint,
    entityType: "insight",
    entityId: `${params.endpoint}:${params.generatedAt}`,
    action: `${params.endpoint}.generated`,
    afterState: {
      user_query: params.userQuery,
      tools_called: toUniqueTools(params.trace),
      inputs: {
        endpoint: params.endpoint,
        method: params.method
      },
      outputs: params.outputs,
      timestamp: params.generatedAt,
      confidence_score: params.trace.confidence_score,
      risk_flags: params.trace.risk_flags
    },
    requestId: params.request.headers.get("x-request-id") ?? null,
    ipAddress: getClientIp(params.request),
    userAgent: params.request.headers.get("user-agent") ?? null
  });
}
