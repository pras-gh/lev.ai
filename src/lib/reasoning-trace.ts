export type ReasoningTraceStep = {
  user_query: string;
  tools_called: string[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  timestamp: string;
  confidence_score: number;
};

export type ReasoningToolChainLink = {
  from: string;
  to: string;
};

export type ReasoningRiskFlag = {
  code: string;
  severity: string;
  title: string;
  detail: string;
};

export type ReasoningTrace = {
  multi_step_reasoning_chain: ReasoningTraceStep[];
  tool_chaining: ReasoningToolChainLink[];
  confidence_score: number;
  risk_flags: ReasoningRiskFlag[];
};

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeConfidenceScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  if (value > 1) {
    return round2(clamp(value / 100, 0.4, 0.98));
  }

  return round2(clamp(value, 0.4, 0.98));
}

export function buildToolChainingFromSteps(
  steps: ReasoningTraceStep[]
): ReasoningToolChainLink[] {
  const links: ReasoningToolChainLink[] = [];
  const seen = new Set<string>();

  const primaryTools = steps
    .map((step) => step.tools_called[0]?.trim())
    .filter((item): item is string => Boolean(item));

  for (let index = 0; index < primaryTools.length - 1; index += 1) {
    const from = primaryTools[index];
    const to = primaryTools[index + 1];
    const key = `${from}->${to}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    links.push({ from, to });
  }

  return links;
}

export function offsetTimestamp(base: Date, offsetMs: number): string {
  return new Date(base.getTime() + offsetMs).toISOString();
}

export function toUniqueTools(trace: ReasoningTrace): string[] {
  return Array.from(
    new Set(trace.multi_step_reasoning_chain.flatMap((step) => step.tools_called))
  );
}
