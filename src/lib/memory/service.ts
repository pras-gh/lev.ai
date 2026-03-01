import {
  buildDeterministicVector,
  buildNamespace,
  fetchVectorById,
  getPineconeVectorDimension,
  upsertVector
} from "@/lib/memory/pinecone";
import type {
  ConversationMemory,
  ConversationMemoryAppend,
  MemoryPreferenceValue,
  ToolOutputMemoryItem,
  WorkspaceMemory,
  WorkspaceMemoryUpdate
} from "@/lib/memory/types";

const WORKSPACE_MEMORY_VECTOR_ID = "workspace-memory-v1";
const CONVERSATION_MEMORY_VECTOR_ID = "conversation-memory-v1";
const MAX_CONVERSATION_ITEMS = 10;
const MAX_LIST_ITEMS = 100;
const MAX_TEXT_LENGTH = 240;

function nowIsoString(): string {
  return new Date().toISOString();
}

function trimText(value: string, maxLength = MAX_TEXT_LENGTH): string {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.slice(0, maxLength);
}

function sanitizeStringList(values: string[] | undefined): string[] | undefined {
  if (!values) {
    return undefined;
  }

  const deduped = new Set<string>();
  for (const raw of values) {
    const next = trimText(String(raw), 120);
    if (next) {
      deduped.add(next);
    }
  }

  return [...deduped].slice(0, MAX_LIST_ITEMS);
}

function sanitizePreferences(
  input: Record<string, MemoryPreferenceValue> | undefined
): Record<string, MemoryPreferenceValue> | undefined {
  if (!input) {
    return undefined;
  }

  const output: Record<string, MemoryPreferenceValue> = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = trimText(rawKey, 64);
    if (!key) {
      continue;
    }

    if (typeof rawValue === "string") {
      output[key] = trimText(rawValue, 160);
      continue;
    }

    if (typeof rawValue === "number" || typeof rawValue === "boolean") {
      output[key] = rawValue;
    }
  }

  return output;
}

function defaultWorkspaceMemory(): WorkspaceMemory {
  return {
    userPreferences: {},
    industry: null,
    accountingMethod: null,
    recurringVendors: [],
    customCategories: [],
    updatedAt: null
  };
}

function defaultConversationMemory(): ConversationMemory {
  return {
    lastFinanceQueries: [],
    recentToolOutputs: [],
    updatedAt: null
  };
}

function parseJsonPayload<T>(value: unknown): T | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function buildWorkspaceNamespace(workspaceId: string): string {
  return buildNamespace(["workspace", workspaceId]);
}

function buildConversationNamespace(workspaceId: string, userId: string): string {
  return buildNamespace(["conversation", workspaceId, userId]);
}

function serializeWorkspaceMemory(memory: WorkspaceMemory): string {
  return JSON.stringify(memory);
}

function serializeConversationMemory(memory: ConversationMemory): string {
  return JSON.stringify(memory);
}

function mergeWorkspaceMemory(
  current: WorkspaceMemory,
  update: WorkspaceMemoryUpdate
): WorkspaceMemory {
  const mergedPreferences = {
    ...current.userPreferences,
    ...(sanitizePreferences(update.userPreferences) ?? {})
  };
  const recurringVendors = sanitizeStringList(update.recurringVendors) ?? current.recurringVendors;
  const customCategories = sanitizeStringList(update.customCategories) ?? current.customCategories;

  return {
    userPreferences: mergedPreferences,
    industry:
      update.industry !== undefined
        ? update.industry === null
          ? null
          : trimText(update.industry, 120)
        : current.industry,
    accountingMethod:
      update.accountingMethod !== undefined ? update.accountingMethod : current.accountingMethod,
    recurringVendors,
    customCategories,
    updatedAt: nowIsoString()
  };
}

function appendConversation(
  current: ConversationMemory,
  append: ConversationMemoryAppend
): ConversationMemory {
  const timestamp = nowIsoString();
  const nextQueries = [...current.lastFinanceQueries];
  const nextOutputs: ToolOutputMemoryItem[] = [...current.recentToolOutputs];

  if (append.query) {
    const query = trimText(append.query, 280);
    if (query) {
      nextQueries.push({ query, timestamp });
    }
  }

  if (append.toolOutput) {
    const tool = trimText(append.toolOutput.tool, 80);
    const output = trimText(append.toolOutput.output, 400);
    if (tool && output) {
      nextOutputs.push({ tool, output, timestamp });
    }
  }

  return {
    lastFinanceQueries: nextQueries.slice(-MAX_CONVERSATION_ITEMS),
    recentToolOutputs: nextOutputs.slice(-MAX_CONVERSATION_ITEMS),
    updatedAt: timestamp
  };
}

function buildWorkspaceMemoryText(memory: WorkspaceMemory): string {
  return [
    `industry:${memory.industry ?? "unknown"}`,
    `accounting_method:${memory.accountingMethod ?? "unknown"}`,
    `vendors:${memory.recurringVendors.join("|")}`,
    `categories:${memory.customCategories.join("|")}`,
    `preferences:${Object.entries(memory.userPreferences)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join("|")}`
  ].join(" ");
}

function buildConversationMemoryText(memory: ConversationMemory): string {
  return [
    `queries:${memory.lastFinanceQueries.map((item) => item.query).join("|")}`,
    `tools:${memory.recentToolOutputs.map((item) => `${item.tool}:${item.output}`).join("|")}`
  ].join(" ");
}

function buildVector(text: string): number[] {
  return buildDeterministicVector(text, getPineconeVectorDimension());
}

export async function getWorkspaceMemory(workspaceId: string): Promise<WorkspaceMemory> {
  const namespace = buildWorkspaceNamespace(workspaceId);
  const vector = await fetchVectorById({
    namespace,
    id: WORKSPACE_MEMORY_VECTOR_ID
  });

  if (!vector) {
    return defaultWorkspaceMemory();
  }

  const payload = parseJsonPayload<WorkspaceMemory>(vector.metadata.payload_json);
  return payload ?? defaultWorkspaceMemory();
}

export async function upsertWorkspaceMemory(params: {
  workspaceId: string;
  actorUserId: string;
  update: WorkspaceMemoryUpdate;
}): Promise<WorkspaceMemory> {
  const current = await getWorkspaceMemory(params.workspaceId);
  const next = mergeWorkspaceMemory(current, params.update);
  const namespace = buildWorkspaceNamespace(params.workspaceId);
  const payloadJson = serializeWorkspaceMemory(next);
  const vectorValues = buildVector(buildWorkspaceMemoryText(next));

  await upsertVector({
    namespace,
    vector: {
      id: WORKSPACE_MEMORY_VECTOR_ID,
      values: vectorValues,
      metadata: {
        kind: "workspace_memory",
        workspace_id: params.workspaceId,
        actor_user_id: params.actorUserId,
        updated_at: next.updatedAt ?? nowIsoString(),
        industry: next.industry ?? "unknown",
        accounting_method: next.accountingMethod ?? "unknown",
        payload_json: payloadJson
      }
    }
  });

  return next;
}

export async function getConversationMemory(params: {
  workspaceId: string;
  userId: string;
}): Promise<ConversationMemory> {
  const namespace = buildConversationNamespace(params.workspaceId, params.userId);
  const vector = await fetchVectorById({
    namespace,
    id: CONVERSATION_MEMORY_VECTOR_ID
  });

  if (!vector) {
    return defaultConversationMemory();
  }

  const payload = parseJsonPayload<ConversationMemory>(vector.metadata.payload_json);
  return payload ?? defaultConversationMemory();
}

export async function appendConversationMemory(params: {
  workspaceId: string;
  userId: string;
  append: ConversationMemoryAppend;
}): Promise<ConversationMemory> {
  const current = await getConversationMemory({
    workspaceId: params.workspaceId,
    userId: params.userId
  });
  const next = appendConversation(current, params.append);
  const namespace = buildConversationNamespace(params.workspaceId, params.userId);
  const payloadJson = serializeConversationMemory(next);
  const vectorValues = buildVector(buildConversationMemoryText(next));

  await upsertVector({
    namespace,
    vector: {
      id: CONVERSATION_MEMORY_VECTOR_ID,
      values: vectorValues,
      metadata: {
        kind: "conversation_memory",
        workspace_id: params.workspaceId,
        user_id: params.userId,
        updated_at: next.updatedAt ?? nowIsoString(),
        payload_json: payloadJson
      }
    }
  });

  return next;
}
