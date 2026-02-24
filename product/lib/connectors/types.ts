import type { NextRequest } from "next/server";
import type { IntegrationProviderId } from "@/lib/integration-catalog";

export type CanonicalTransaction = {
  externalTxnId: string;
  occurredAt: string;
  amount: string;
  direction: "credit" | "debit";
  description: string;
  counterparty: string;
  currencyCode: string;
  gstApplicable: boolean;
  gstRate: string | null;
  gstAmount: string | null;
  metadata?: Record<string, unknown>;
};

export type AdapterContext = {
  workspaceId: string;
  businessId: number;
  provider: IntegrationProviderId;
};

export type AdapterAuthorizeInput = {
  token?: string;
  scopesHint?: string[];
  accountLabel?: string;
};

export type AdapterAuthorizeResult = {
  ok: boolean;
  scopes: string[];
  accountLabel?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type AdapterPullInput = {
  cursor?: string | null;
  limit?: number;
};

export type AdapterPullResult = {
  transactions: CanonicalTransaction[];
  nextCursor: string | null;
  metadata?: Record<string, unknown>;
};

export type AdapterWebhookInput = {
  request: NextRequest;
  payload: Record<string, unknown>;
};

export type AdapterWebhookResult = {
  eventId: string;
  eventType: string;
  transactions: CanonicalTransaction[];
  metadata?: Record<string, unknown>;
};

export type AdapterHealthResult = {
  ok: boolean;
  message?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
};

export interface ProviderAdapter {
  readonly provider: IntegrationProviderId;
  authorize(input: AdapterAuthorizeInput, context: AdapterContext): Promise<AdapterAuthorizeResult>;
  backfill(input: AdapterPullInput, context: AdapterContext): Promise<AdapterPullResult>;
  delta(input: AdapterPullInput, context: AdapterContext): Promise<AdapterPullResult>;
  webhook_handler(input: AdapterWebhookInput, context: AdapterContext): Promise<AdapterWebhookResult>;
  normalize(raw: unknown, context: AdapterContext): Promise<CanonicalTransaction[]>;
  healthcheck(context: AdapterContext): Promise<AdapterHealthResult>;
}
