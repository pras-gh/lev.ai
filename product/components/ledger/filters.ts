"use client";

import { useQuery } from "@tanstack/react-query";

export type CategoryOption = {
  id: number;
  name: string;
};

export type FilterState = {
  q: string;
  status: "all" | "pending" | "posted" | "reversed";
  source:
    | "all"
    | "bank"
    | "upi"
    | "razorpay"
    | "stripe"
    | "hdfc"
    | "icici"
    | "gpay"
    | "tally"
    | "whatsapp"
    | "zohobooks"
    | "manual"
    | "csv_import"
    | "csv_proof"
    | "reversal"
    | "import";
  category: string;
  from: string;
  to: string;
  includeHidden: boolean;
};

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  status: "all",
  source: "all",
  category: "",
  from: "",
  to: "",
  includeHidden: false
};

type CategoriesResponse = {
  categories?: Array<{
    id: number | string;
    name: string;
  }>;
};

function parseErrorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") {
    return fallback;
  }

  const record = json as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  return fallback;
}

async function fetchCategories(scopeQuery: string): Promise<CategoryOption[]> {
  const response = await fetch(`/api/categories?${scopeQuery}&page=1&limit=200`, {
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(payload, `Categories request failed (${response.status})`));
  }

  const data = (await response.json()) as CategoriesResponse;

  return (data.categories ?? [])
    .map((category) => ({
      id: typeof category.id === "number" ? category.id : Number.parseInt(String(category.id), 10),
      name: category.name
    }))
    .filter((category) => Number.isInteger(category.id) && category.id > 0);
}

export function useCategories(scopeQuery: string) {
  const query = useQuery({
    queryKey: ["categories", scopeQuery],
    queryFn: () => fetchCategories(scopeQuery),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000
  });

  return {
    ...query,
    categories: query.data ?? []
  };
}
