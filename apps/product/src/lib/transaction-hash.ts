import { createHash } from "node:crypto";

const ACCOUNT_HINT_KEYS = [
  "account",
  "accountno",
  "accountnumber",
  "ac",
  "acno",
  "acnumber",
  "acct",
  "acctno",
  "bankaccount",
  "sourceaccount",
  "fromaccount"
] as const;

function toCompactKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeHashText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildHashDescription(parts: Array<string | null | undefined>): string {
  const combined = parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter((part) => part.length > 0)
    .join(" ");

  return normalizeHashText(combined);
}

function toDateKey(value: string | Date): string {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("date must be a valid date string");
  }

  return parsed.toISOString().slice(0, 10);
}

function toAmountKey(value: string | number | bigint): string {
  if (typeof value === "bigint") {
    return `${value.toString()}.00`;
  }

  const raw = typeof value === "number" ? String(value) : value;
  const normalized = raw.trim().replace(/[,\s]/g, "").replace(/[₹$€£]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error("amount must be a valid numeric value");
  }

  return Math.abs(parsed).toFixed(2);
}

export function buildTransactionHashPayload(params: {
  date: string | Date;
  amount: string | number | bigint;
  description?: string | null;
  account?: string | null;
}): string {
  const dateKey = toDateKey(params.date);
  const amountKey = toAmountKey(params.amount);
  const descriptionKey = normalizeHashText(params.description ?? "");
  const accountKey = normalizeHashText(params.account ?? "");

  return `${dateKey}|${amountKey}|${descriptionKey}|${accountKey}`;
}

export function computeTransactionHash(params: {
  date: string | Date;
  amount: string | number | bigint;
  description?: string | null;
  account?: string | null;
}): string {
  const payload = buildTransactionHashPayload(params);
  return createHash("sha256").update(payload).digest("hex");
}

export function extractAccountHintFromRecord(record: Record<string, unknown>): string | undefined {
  const entries = Object.entries(record);

  for (const [rawKey, rawValue] of entries) {
    const key = toCompactKey(rawKey);
    if (!ACCOUNT_HINT_KEYS.includes(key as (typeof ACCOUNT_HINT_KEYS)[number])) {
      continue;
    }

    const value = asTrimmedString(rawValue);
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function extractAccountHintFromMetadata(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) {
    return undefined;
  }

  const direct = extractAccountHintFromRecord(metadata);
  if (direct) {
    return direct;
  }

  const nestedCandidates = [metadata.raw, metadata.bank, metadata.account] as unknown[];
  for (const candidate of nestedCandidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const hint = extractAccountHintFromRecord(candidate);
    if (hint) {
      return hint;
    }
  }

  return undefined;
}
