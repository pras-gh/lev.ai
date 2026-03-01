const LLM_ALLOWED_CAPABILITIES = ["understand", "route", "explain", "suggest"] as const;
const ENGINE_REQUIRED_RESPONSIBILITIES = ["compute", "validate", "enforce_rules"] as const;
const LLM_FORBIDDEN_ACTIONS = [
  "raw_financial_arithmetic",
  "tax_formula_calculation",
  "ledger_reaggregation",
  "compliance_rule_execution"
] as const;

export type LlmAllowedCapability = (typeof LLM_ALLOWED_CAPABILITIES)[number];
export type EngineRequiredResponsibility = (typeof ENGINE_REQUIRED_RESPONSIBILITIES)[number];
export type LlmForbiddenAction = (typeof LLM_FORBIDDEN_ACTIONS)[number];

export type FinanceMathBoundaryPolicy = {
  version: "finance-math-boundary-v1";
  statement: "LLM never touches raw financial math.";
  llmAllowedCapabilities: readonly LlmAllowedCapability[];
  engineResponsibilities: readonly EngineRequiredResponsibility[];
  llmForbiddenActions: readonly LlmForbiddenAction[];
};

export type LlmNarrativeInput = {
  question: string;
  facts: string[];
  context: string[];
  suggestions: string[];
};

export type FinanceBoundaryEnvelope<TComputed> = {
  policy: FinanceMathBoundaryPolicy;
  computed: TComputed;
  llmNarrativeInput: LlmNarrativeInput;
};

type CreateFinanceBoundaryEnvelopeParams<TComputed> = {
  question: string;
  computed: TComputed;
  facts: readonly string[];
  suggestions: readonly string[];
  context?: readonly string[];
};

const BASE_POLICY: FinanceMathBoundaryPolicy = {
  version: "finance-math-boundary-v1",
  statement: "LLM never touches raw financial math.",
  llmAllowedCapabilities: LLM_ALLOWED_CAPABILITIES,
  engineResponsibilities: ENGINE_REQUIRED_RESPONSIBILITIES,
  llmForbiddenActions: LLM_FORBIDDEN_ACTIONS
};

function sanitizeLines(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized.slice(0, 400));
  }

  return result;
}

export function createFinanceBoundaryEnvelope<TComputed>(
  params: CreateFinanceBoundaryEnvelopeParams<TComputed>
): FinanceBoundaryEnvelope<TComputed> {
  const question = params.question.trim();
  if (!question) {
    throw new Error("Finance boundary requires a non-empty question");
  }

  const facts = sanitizeLines(params.facts);
  if (facts.length === 0) {
    throw new Error("Finance boundary requires at least one computed fact");
  }

  const suggestions = sanitizeLines(params.suggestions);
  const context = sanitizeLines(params.context ?? []);

  return {
    policy: BASE_POLICY,
    computed: params.computed,
    llmNarrativeInput: {
      question: question.slice(0, 280),
      facts,
      context,
      suggestions
    }
  };
}
