export type IntegrationProviderId =
  | "hdfc"
  | "icici"
  | "razorpay"
  | "gpay"
  | "stripe"
  | "tally"
  | "whatsapp"
  | "zohobooks";

export type IntegrationProviderDef = {
  id: IntegrationProviderId;
  label: string;
  kind: "bank" | "payments" | "erp" | "messaging";
  blurb: string;
};

export const INTEGRATION_PROVIDERS: IntegrationProviderDef[] = [
  {
    id: "hdfc",
    label: "HDFC Bank",
    kind: "bank",
    blurb: "Bank statements and balance snapshots"
  },
  {
    id: "icici",
    label: "ICICI Bank",
    kind: "bank",
    blurb: "Bank account feeds for credits and debits"
  },
  {
    id: "razorpay",
    label: "Razorpay",
    kind: "payments",
    blurb: "Settlements, fees, and payout events"
  },
  {
    id: "gpay",
    label: "Google Pay",
    kind: "payments",
    blurb: "UPI transaction stream"
  },
  {
    id: "stripe",
    label: "Stripe",
    kind: "payments",
    blurb: "Payout and charge activity"
  },
  {
    id: "tally",
    label: "Tally",
    kind: "erp",
    blurb: "Ledger sync and posting bridge"
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    kind: "messaging",
    blurb: "Customer payment notification hooks"
  },
  {
    id: "zohobooks",
    label: "Zoho Books",
    kind: "erp",
    blurb: "Books sync for vouchers and invoices"
  }
];

export const ALLOWED_INTEGRATION_PROVIDERS = new Set(
  INTEGRATION_PROVIDERS.map((provider) => provider.id)
);

export function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return ALLOWED_INTEGRATION_PROVIDERS.has(value as IntegrationProviderId);
}

export function integrationProviderLabel(id: string): string {
  const found = INTEGRATION_PROVIDERS.find((provider) => provider.id === id);
  return found?.label ?? id.toUpperCase();
}
