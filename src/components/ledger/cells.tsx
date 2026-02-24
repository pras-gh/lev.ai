"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type ScopeBody = {
  workspaceId?: string;
  businessId?: number;
};

type CategoryOption = {
  id: number;
  name: string;
};

type CategoryCellProps = {
  transactionId: number;
  currentCategoryId: number | null;
  currentCategoryName: string;
  scopeKey: string;
  categories: CategoryOption[];
  scopeBody: ScopeBody;
  suggestion?: {
    categoryId: number;
    categoryName: string;
    confidence: number;
  } | null;
  disabled?: boolean;
  onOptimisticUpdate: (nextCategoryId: number | null, nextCategoryName: string) => void;
  onMutationStateChange?: (isPending: boolean) => void;
  onError?: (message: string) => void;
};

type MutationContext = {
  previousCategoryId: number | null;
  previousCategoryName: string;
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

export function CategoryCell({
  transactionId,
  currentCategoryId,
  currentCategoryName,
  scopeKey,
  categories,
  scopeBody,
  suggestion,
  disabled,
  onOptimisticUpdate,
  onMutationStateChange,
  onError
}: CategoryCellProps) {
  const queryClient = useQueryClient();
  const [inlineError, setInlineError] = useState<string | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const mutation = useMutation({
    mutationFn: async (nextCategoryId: number | null) => {
      const response = await fetch(`/api/transactions/${transactionId}/category`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          categoryId: nextCategoryId
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to update transaction category"));
      }
    },
    onMutate: async (nextCategoryId): Promise<MutationContext> => {
      onMutationStateChange?.(true);
      setInlineError(null);

      const nextCategoryName =
        nextCategoryId === null ? "Uncategorized" : categoryById.get(nextCategoryId) ?? currentCategoryName;

      onOptimisticUpdate(nextCategoryId, nextCategoryName);

      return {
        previousCategoryId: currentCategoryId,
        previousCategoryName: currentCategoryName
      };
    },
    onError: (error, _nextCategoryId, context) => {
      if (context) {
        onOptimisticUpdate(context.previousCategoryId, context.previousCategoryName);
      }

      const message = error instanceof Error ? error.message : "Failed to update category";
      setInlineError(message);
      onError?.(message);
    },
    onSettled: async () => {
      onMutationStateChange?.(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions", scopeKey] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] }),
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "overview"] })
      ]);
    }
  });

  const value = currentCategoryId ?? "";
  const isDisabled = Boolean(disabled || mutation.isPending);
  const suggestionData = suggestion ?? null;
  const hasSuggestion =
    suggestionData !== null && suggestionData.categoryId !== currentCategoryId;

  return (
    <div className="w-52 space-y-1">
      {hasSuggestion ? (
        <button
          type="button"
          onClick={() => {
            if (!suggestionData) {
              return;
            }
            mutation.mutate(suggestionData.categoryId);
          }}
          disabled={isDisabled}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-800 transition hover:bg-zinc-200 disabled:opacity-60"
        >
          Suggested: {suggestionData?.categoryName} ({Math.round((suggestionData?.confidence ?? 0) * 100)}%) -{" "}
          <span className="font-semibold">Apply</span>
        </button>
      ) : null}

      <select
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          const nextCategoryId = raw.trim() === "" ? null : Number.parseInt(raw, 10);
          mutation.mutate(nextCategoryId);
        }}
        disabled={isDisabled}
        className={`w-full rounded-lg border bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm disabled:opacity-70 ${
          inlineError ? "border-zinc-500" : "border-zinc-300"
        }`}
      >
        <option value="">Uncategorized</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {inlineError ? <p className="text-[11px] text-zinc-700">{inlineError}</p> : null}
    </div>
  );
}
