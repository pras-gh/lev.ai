import { PrismaClient, TxnStatus } from "@prisma/client";

type Rule = {
  category:
    | "revenue"
    | "tax"
    | "payroll"
    | "marketing"
    | "saas"
    | "logistics"
    | "rent/utilities";
  patterns: RegExp[];
  weight?: number;
};

export type CategorizationV0Result = {
  categoryName: string | null;
  confidence: number;
  matchedRule?: string;
  tags: string[];
};

const RULES: Rule[] = [
  {
    category: "revenue",
    weight: 3,
    patterns: [
      /\brazorpay\b.*\bsettlement\b/i,
      /\bsettlement\b.*\brazorpay\b/i,
      /\bstripe\b.*\bpayout\b/i,
      /\bpayout\b.*\bstripe\b/i,
      /\bpayment received\b/i,
      /\bpayment\s+rec(?:eive|ei)db?\b/i
    ]
  },
  {
    category: "tax",
    weight: 3,
    patterns: [
      /\bgst\b/i,
      /\bgstr\b/i,
      /\bcbic\b/i,
      /\btax payment\b/i,
      /\bsgst\b/i,
      /\bcgst\b/i,
      /\bigst\b/i,
      /\btax\b/i,
      /\btds\b/i
    ]
  },
  {
    category: "payroll",
    weight: 3,
    patterns: [
      /\bsalary\b/i,
      /\bpayroll\b/i,
      /\bpf\b/i,
      /\besic\b/i,
      /\besi\b/i,
      /\bstipend\b/i,
      /\bwages?\b/i
    ]
  },
  {
    category: "marketing",
    weight: 3,
    patterns: [
      /\bfacebook ads\b/i,
      /\bgoogle ads\b/i,
      /\bmeta ads\b/i,
      /\bad spend\b/i,
      /\badvertising\b/i,
      /\bfb ads\b/i
    ]
  },
  {
    category: "saas",
    weight: 3,
    patterns: [/\bzoho\b/i, /\baws\b/i, /\bnotion\b/i, /\bopenai\b/i, /\bsoftware\b/i]
  },
  {
    category: "logistics",
    weight: 3,
    patterns: [/\bdelhivery\b/i, /\bshiprocket\b/i, /\bcourier\b/i, /\bshipping\b/i]
  },
  {
    category: "rent/utilities",
    weight: 3,
    patterns: [
      /\brent\b/i,
      /\belectricity\b/i,
      /\binternet\b/i,
      /\blease\b/i,
      /\bpower bill\b/i,
      /\butility\b/i
    ]
  }
];

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const CATEGORIZE_V0_VERSION = "v0";
export const CATEGORIZE_V0_TARGET_RATE = 0.8;

const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCategoryKey = (value: string) => normalizeText(value);

export function categorizeTransactionV0(input: {
  description?: string | null;
  merchant?: string | null;
  reference?: string | null;
}): CategorizationV0Result {
  const text = normalizeText(
    [input.description, input.merchant, input.reference]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(" ")
  );

  if (!text) {
    return { categoryName: null, confidence: 0, tags: [] };
  }

  let best: { category: Rule["category"]; score: number; matched: string } | null = null;

  for (const rule of RULES) {
    let hits = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        hits += 1;
      }
    }

    if (!hits) {
      continue;
    }

    const score = hits * (rule.weight ?? 1);

    if (!best || score > best.score) {
      best = { category: rule.category, score, matched: rule.category };
    }
  }

  if (!best) {
    return { categoryName: null, confidence: 0, tags: [] };
  }

  const confidence = best.score >= 6 ? 0.9 : best.score >= 3 ? 0.8 : 0.65;

  return {
    categoryName: best.category,
    confidence,
    matchedRule: best.matched,
    tags: ["rules:v0", `bucket:${best.category}`]
  };
}

function resolveCategoryIdByRuleName(params: {
  categoryName: string;
  categoryMap: Map<string, bigint>;
}): bigint | null {
  const key = normalizeCategoryKey(params.categoryName);

  const aliasesByRule: Record<string, string[]> = {
    tax: ["tax", "taxes", "gst"],
    payroll: ["payroll", "salary", "salaries"],
    revenue: ["revenue", "sales revenue", "other income", "income"],
    marketing: ["marketing", "facebook ads", "google ads", "advertising", "ads"],
    saas: ["saas", "software", "tools", "subscriptions"],
    logistics: ["logistics", "shipping", "courier", "delhivery", "shiprocket"],
    "rent/utilities": [
      "rent/utilities",
      "rent and utilities",
      "rent",
      "utilities",
      "electricity",
      "internet",
      "fixed cost"
    ]
  };

  const aliases = aliasesByRule[key] ?? [key];

  for (const alias of aliases) {
    const found = params.categoryMap.get(normalizeCategoryKey(alias));
    if (found) {
      return found;
    }
  }

  return null;
}

export function buildCategoryNameIdMap(categories: Array<{ id: bigint; name: string }>) {
  return new Map(categories.map((category) => [normalizeCategoryKey(category.name), category.id]));
}

export function resolveCategoryIdByCategoryName(params: {
  categoryName: string;
  categoryMap: Map<string, bigint>;
}): bigint | null {
  return resolveCategoryIdByRuleName(params);
}

export async function autoTagTransactionsV0(params: {
  businessId: bigint;
  confidenceThreshold?: number;
  limit?: number;
}) {
  const confidenceThreshold = params.confidenceThreshold ?? 0.65;
  const limit = params.limit ?? 500;

  if (confidenceThreshold < 0 || confidenceThreshold > 1) {
    throw new Error("confidenceThreshold must be between 0 and 1");
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 5000) {
    throw new Error("limit must be an integer between 1 and 5000");
  }

  const txns = await prisma.transaction.findMany({
    where: {
      businessId: params.businessId,
      isDeleted: false,
      categoryId: null,
      status: { in: [TxnStatus.posted, TxnStatus.reversed] }
    },
    take: limit,
    orderBy: { txnDate: "desc" },
    select: { id: true, description: true, merchant: true, reference: true }
  });

  if (!txns.length) {
    return { scanned: 0, tagged: 0, coverage: 0 };
  }

  const categories = await prisma.category.findMany({
    where: { businessId: params.businessId },
    select: { id: true, name: true }
  });

  const categoryMap = buildCategoryNameIdMap(categories);

  let tagged = 0;

  for (const txn of txns) {
    const result = categorizeTransactionV0(txn);

    if (!result.categoryName || result.confidence < confidenceThreshold) {
      continue;
    }

    const categoryId = resolveCategoryIdByRuleName({
      categoryName: result.categoryName,
      categoryMap
    });

    if (!categoryId) {
      continue;
    }

    await prisma.$transaction(async (db) => {
      await db.transaction.update({
        where: { id: txn.id },
        data: { categoryId }
      });

      await db.auditLog.create({
        data: {
          businessId: params.businessId,
          actorType: "system",
          action: "transaction.autotag_v0",
          entityType: "Transaction",
          entityId: String(txn.id),
          afterState: {
            category: result.categoryName,
            confidence: result.confidence,
            rule: result.matchedRule
          }
        }
      });
    });

    tagged += 1;
  }

  return {
    scanned: txns.length,
    tagged,
    coverage: txns.length === 0 ? 0 : tagged / txns.length
  };
}
