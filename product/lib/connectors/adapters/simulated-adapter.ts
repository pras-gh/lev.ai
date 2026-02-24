import { createHash } from "node:crypto";
import type {
  AdapterAuthorizeInput,
  AdapterAuthorizeResult,
  AdapterContext,
  AdapterHealthResult,
  AdapterPullInput,
  AdapterPullResult,
  AdapterWebhookInput,
  AdapterWebhookResult,
  CanonicalTransaction,
  ProviderAdapter
} from "@/lib/connectors/types";
import type { IntegrationProviderId } from "@/lib/integration-catalog";

type Seed = {
  direction: "credit" | "debit";
  amount: number;
  description: string;
  counterparty: string;
  gstApplicable?: boolean;
  gstRate?: number;
};

type SimulatedAdapterConfig = {
  provider: IntegrationProviderId;
  scopes: string[];
  seeds: Seed[];
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildDeterministicExternalId(params: {
  provider: IntegrationProviderId;
  direction: "credit" | "debit";
  amount: string;
  description: string;
  counterparty: string;
  bucket: string;
}): string {
  const hash = createHash("sha256")
    .update(
      [
        params.provider,
        params.direction,
        params.amount,
        normalizeText(params.description),
        normalizeText(params.counterparty),
        params.bucket
      ].join("|")
    )
    .digest("hex")
    .slice(0, 20);

  return `SIM-${params.provider.toUpperCase()}-${hash}`;
}

function normalizeDirection(value: unknown): "credit" | "debit" {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["credit", "cr", "in", "incoming", "inflow"].includes(normalized)) {
    return "credit";
  }

  if (["debit", "dr", "out", "outgoing", "outflow"].includes(normalized)) {
    return "debit";
  }

  return "credit";
}

function normalizeAmount(raw: unknown): number {
  const value =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.trim()) : Number.NaN;
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
}

function normalizeDate(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export class SimulatedProviderAdapter implements ProviderAdapter {
  readonly provider: IntegrationProviderId;
  private readonly scopes: string[];
  private readonly seeds: Seed[];

  constructor(config: SimulatedAdapterConfig) {
    this.provider = config.provider;
    this.scopes = config.scopes;
    this.seeds = config.seeds;
  }

  async authorize(
    input: AdapterAuthorizeInput,
    _context: AdapterContext
  ): Promise<AdapterAuthorizeResult> {
    const token = input.token?.trim() ?? "";
    if (token && token.length < 6) {
      return {
        ok: false,
        scopes: [],
        reason: "Token is too short"
      };
    }

    return {
      ok: true,
      scopes: this.scopes,
      accountLabel: input.accountLabel,
      metadata: {
        mode: "adapter_authorize_simulated_v1"
      }
    };
  }

  async backfill(input: AdapterPullInput, context: AdapterContext): Promise<AdapterPullResult> {
    return {
      transactions: this.simulateTransactions({
        limit: input.limit ?? 20,
        bucket: "backfill",
        anchorIso: new Date().toISOString()
      }),
      nextCursor: `${context.provider}:backfill:${Date.now()}`,
      metadata: {
        mode: "backfill",
        provider: this.provider,
        requestedCursor: input.cursor ?? null
      }
    };
  }

  async delta(input: AdapterPullInput, context: AdapterContext): Promise<AdapterPullResult> {
    return {
      transactions: this.simulateTransactions({
        limit: input.limit ?? 8,
        bucket: "delta",
        anchorIso: new Date().toISOString()
      }),
      nextCursor: `${context.provider}:delta:${Date.now()}`,
      metadata: {
        mode: "delta",
        provider: this.provider,
        requestedCursor: input.cursor ?? null
      }
    };
  }

  async webhook_handler(
    input: AdapterWebhookInput,
    _context: AdapterContext
  ): Promise<AdapterWebhookResult> {
    const payload = input.payload;
    const eventType =
      (typeof payload.eventType === "string" && payload.eventType.trim()) ||
      (typeof payload.type === "string" && payload.type.trim()) ||
      "transaction.created";

    const externalRefRaw =
      (typeof payload.externalRef === "string" && payload.externalRef.trim()) ||
      (typeof payload.reference === "string" && payload.reference.trim()) ||
      (typeof payload.id === "string" && payload.id.trim()) ||
      (typeof payload.eventId === "string" && payload.eventId.trim()) ||
      `${this.provider}:${Date.now()}`;

    const eventId =
      (typeof payload.eventId === "string" && payload.eventId.trim()) ||
      (typeof payload.id === "string" && payload.id.trim()) ||
      createHash("sha256")
        .update(JSON.stringify({ provider: this.provider, payload }))
        .digest("hex");

    const transaction: CanonicalTransaction = {
      externalTxnId: externalRefRaw,
      occurredAt: normalizeDate(payload.occurredAt ?? payload.timestamp),
      amount: normalizeAmount(payload.amount ?? payload.value ?? payload.amount_minor).toFixed(2),
      direction: normalizeDirection(payload.direction ?? payload.type),
      description:
        (typeof payload.description === "string" && payload.description.trim()) ||
        (typeof payload.narration === "string" && payload.narration.trim()) ||
        `${this.provider.toUpperCase()} webhook transaction`,
      counterparty:
        (typeof payload.counterparty === "string" && payload.counterparty.trim()) ||
        (typeof payload.merchant === "string" && payload.merchant.trim()) ||
        this.provider.toUpperCase(),
      currencyCode:
        (typeof payload.currency === "string" && payload.currency.trim().toUpperCase()) || "INR",
      gstApplicable: false,
      gstRate: null,
      gstAmount: null,
      metadata: {
        rawEventType: eventType
      }
    };

    return {
      eventId,
      eventType,
      transactions: [transaction],
      metadata: {
        source: "adapter_webhook_simulated_v1"
      }
    };
  }

  async normalize(
    raw: unknown,
    _context: AdapterContext
  ): Promise<CanonicalTransaction[]> {
    if (Array.isArray(raw)) {
      return raw
        .map((row) => this.normalizeSingleRecord(row as Record<string, unknown>))
        .filter((row): row is CanonicalTransaction => Boolean(row));
    }

    if (raw && typeof raw === "object") {
      const row = this.normalizeSingleRecord(raw as Record<string, unknown>);
      return row ? [row] : [];
    }

    return [];
  }

  async healthcheck(_context: AdapterContext): Promise<AdapterHealthResult> {
    const started = Date.now();
    return {
      ok: true,
      message: "Adapter healthy",
      latencyMs: Date.now() - started,
      metadata: {
        provider: this.provider
      }
    };
  }

  private simulateTransactions(params: {
    limit: number;
    bucket: string;
    anchorIso: string;
  }): CanonicalTransaction[] {
    if (!this.seeds.length || params.limit <= 0) {
      return [];
    }

    const anchor = new Date(params.anchorIso);

    return Array.from({ length: params.limit }).map((_, index) => {
      const seed = this.seeds[index % this.seeds.length];
      const occurredAt = new Date(anchor.getTime() - index * 2 * 60 * 60 * 1000).toISOString();
      const amount = seed.amount.toFixed(2);
      const gstRate = seed.gstApplicable ? (seed.gstRate ?? 18).toFixed(3) : null;
      const gstAmount =
        seed.gstApplicable && gstRate
          ? ((seed.amount * Number(gstRate)) / 100).toFixed(2)
          : null;

      return {
        externalTxnId: buildDeterministicExternalId({
          provider: this.provider,
          direction: seed.direction,
          amount,
          description: seed.description,
          counterparty: seed.counterparty,
          bucket: `${params.bucket}:${index % this.seeds.length}`
        }),
        occurredAt,
        amount,
        direction: seed.direction,
        description: seed.description,
        counterparty: seed.counterparty,
        currencyCode: "INR",
        gstApplicable: Boolean(seed.gstApplicable),
        gstRate,
        gstAmount,
        metadata: {
          mode: params.bucket,
          provider: this.provider,
          rowNumber: index + 1
        }
      };
    });
  }

  private normalizeSingleRecord(raw: Record<string, unknown>): CanonicalTransaction | null {
    const externalTxnId =
      (typeof raw.externalTxnId === "string" && raw.externalTxnId.trim()) ||
      (typeof raw.externalRef === "string" && raw.externalRef.trim()) ||
      (typeof raw.reference === "string" && raw.reference.trim()) ||
      (typeof raw.id === "string" && raw.id.trim()) ||
      null;

    if (!externalTxnId) {
      return null;
    }

    return {
      externalTxnId,
      occurredAt: normalizeDate(raw.occurredAt ?? raw.timestamp),
      amount: normalizeAmount(raw.amount ?? raw.value ?? raw.amount_minor).toFixed(2),
      direction: normalizeDirection(raw.direction ?? raw.type),
      description:
        (typeof raw.description === "string" && raw.description.trim()) ||
        (typeof raw.narration === "string" && raw.narration.trim()) ||
        `${this.provider.toUpperCase()} normalized transaction`,
      counterparty:
        (typeof raw.counterparty === "string" && raw.counterparty.trim()) ||
        (typeof raw.merchant === "string" && raw.merchant.trim()) ||
        this.provider.toUpperCase(),
      currencyCode: (typeof raw.currencyCode === "string" && raw.currencyCode.trim().toUpperCase()) || "INR",
      gstApplicable: Boolean(raw.gstApplicable),
      gstRate:
        raw.gstRate !== undefined && raw.gstRate !== null ? Number(raw.gstRate).toFixed(3) : null,
      gstAmount:
        raw.gstAmount !== undefined && raw.gstAmount !== null ? Number(raw.gstAmount).toFixed(2) : null,
      metadata: {
        normalizedBy: "SimulatedProviderAdapter"
      }
    };
  }
}

export const ADAPTER_SEEDS: Record<IntegrationProviderId, Seed[]> = {
  hdfc: [
    { direction: "credit", amount: 125000, description: "NEFT settlement received", counterparty: "Enterprise Client A", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 4200, description: "Bank processing fee", counterparty: "HDFC Charges", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 32500, description: "Vendor payment batch", counterparty: "Operations Vendor" }
  ],
  icici: [
    { direction: "credit", amount: 88000, description: "Collection deposit", counterparty: "Collection Desk", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 57000, description: "Payroll transfer", counterparty: "Salary Account" },
    { direction: "debit", amount: 2200, description: "Internet and utility payment", counterparty: "Utility Provider", gstApplicable: true, gstRate: 18 }
  ],
  razorpay: [
    { direction: "credit", amount: 156400, description: "Razorpay settlement", counterparty: "Razorpay", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 5100, description: "Razorpay platform fee", counterparty: "Razorpay", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 900, description: "Payment gateway adjustment", counterparty: "Razorpay", gstApplicable: true, gstRate: 18 }
  ],
  gpay: [
    { direction: "credit", amount: 34500, description: "UPI collection", counterparty: "Google Pay", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 12800, description: "UPI payout", counterparty: "Google Pay" },
    { direction: "debit", amount: 350, description: "UPI processing charge", counterparty: "Google Pay", gstApplicable: true, gstRate: 18 }
  ],
  stripe: [
    { direction: "credit", amount: 112800, description: "Stripe payout", counterparty: "Stripe", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 4100, description: "Stripe fees", counterparty: "Stripe", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 1400, description: "Dispute fee reserve", counterparty: "Stripe" }
  ],
  tally: [
    { direction: "debit", amount: 16000, description: "Journal import adjustment", counterparty: "Tally Connector" },
    { direction: "credit", amount: 16000, description: "Ledger balancing entry", counterparty: "Tally Connector" },
    { direction: "debit", amount: 2500, description: "ERP sync service charge", counterparty: "Tally Services", gstApplicable: true, gstRate: 18 }
  ],
  whatsapp: [
    { direction: "credit", amount: 9000, description: "Payment link collection", counterparty: "WhatsApp Payments", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 600, description: "Conversation utility fee", counterparty: "WhatsApp API", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 1200, description: "Marketing campaign spend", counterparty: "WhatsApp API", gstApplicable: true, gstRate: 18 }
  ],
  zohobooks: [
    { direction: "credit", amount: 45000, description: "Invoice receipt sync", counterparty: "Zoho Books", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 18000, description: "Bill payment sync", counterparty: "Zoho Books", gstApplicable: true, gstRate: 18 },
    { direction: "debit", amount: 1500, description: "Subscription sync fee", counterparty: "Zoho Books", gstApplicable: true, gstRate: 18 }
  ]
};
