import { createHash } from "node:crypto";

type PineconeMetadataValue = string | number | boolean | string[];

type PineconeVector = {
  id: string;
  values: number[];
  metadata?: Record<string, PineconeMetadataValue>;
};

type FetchResponseVector = {
  id?: unknown;
  values?: unknown;
  metadata?: unknown;
};

type FetchResponsePayload = {
  vectors?: Record<string, FetchResponseVector>;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("PINECONE_INDEX_HOST is required.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function resolvePineconeConfig() {
  const apiKey = (process.env.PINECONE_API_KEY ?? "").trim();
  const indexHost = normalizeUrl(process.env.PINECONE_INDEX_HOST ?? "");
  const dimensionRaw = (process.env.PINECONE_VECTOR_DIMENSION ?? "64").trim();
  const dimension = Number.parseInt(dimensionRaw, 10);

  if (!apiKey) {
    throw new Error("PINECONE_API_KEY is required.");
  }

  if (!Number.isInteger(dimension) || dimension <= 0 || dimension > 4096) {
    throw new Error("PINECONE_VECTOR_DIMENSION must be an integer between 1 and 4096.");
  }

  return {
    apiKey,
    indexHost,
    dimension
  };
}

function sanitizeNamespaceSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return normalized.replace(/^-+|-+$/g, "").slice(0, 63) || "default";
}

export function buildNamespace(parts: string[]): string {
  return parts.map((part) => sanitizeNamespaceSegment(part)).join(":");
}

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return values.map(() => 0);
  }

  return values.map((value) => Number((value / magnitude).toFixed(6)));
}

export function buildDeterministicVector(input: string, dimension: number): number[] {
  const digest = createHash("sha256").update(input).digest();
  const values = new Array<number>(dimension).fill(0);

  for (let index = 0; index < dimension; index += 1) {
    const byte = digest[index % digest.length] ?? 0;
    const sign = byte % 2 === 0 ? 1 : -1;
    const magnitude = ((byte % 101) + 1) / 101;
    values[index] = sign * magnitude;
  }

  return normalizeVector(values);
}

async function pineconeRequest(pathname: string, init: RequestInit): Promise<Response> {
  const { apiKey, indexHost } = resolvePineconeConfig();
  const response = await fetch(`${indexHost}${pathname}`, {
    ...init,
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  return response;
}

function parseMetadata(raw: unknown): Record<string, PineconeMetadataValue> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const source = raw as Record<string, unknown>;
  const output: Record<string, PineconeMetadataValue> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      output[key] = value;
      continue;
    }

    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      output[key] = value;
    }
  }

  return output;
}

export async function fetchVectorById(params: {
  namespace: string;
  id: string;
}): Promise<{ id: string; metadata: Record<string, PineconeMetadataValue> } | null> {
  const response = await pineconeRequest("/vectors/fetch", {
    method: "POST",
    body: JSON.stringify({
      namespace: params.namespace,
      ids: [params.id]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Pinecone fetch failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as FetchResponsePayload;
  const vector = payload.vectors?.[params.id];
  if (!vector || typeof vector.id !== "string") {
    return null;
  }

  return {
    id: vector.id,
    metadata: parseMetadata(vector.metadata)
  };
}

export async function upsertVector(params: {
  namespace: string;
  vector: PineconeVector;
}): Promise<void> {
  const response = await pineconeRequest("/vectors/upsert", {
    method: "POST",
    body: JSON.stringify({
      namespace: params.namespace,
      vectors: [params.vector]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Pinecone upsert failed (${response.status}): ${message}`);
  }
}

export function getPineconeVectorDimension(): number {
  return resolvePineconeConfig().dimension;
}
