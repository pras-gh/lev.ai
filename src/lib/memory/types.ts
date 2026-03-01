export type AccountingMethod = "cash" | "accrual";

export type MemoryPreferenceValue = string | number | boolean;

export type WorkspaceMemory = {
  userPreferences: Record<string, MemoryPreferenceValue>;
  industry: string | null;
  accountingMethod: AccountingMethod | null;
  recurringVendors: string[];
  customCategories: string[];
  updatedAt: string | null;
};

export type WorkspaceMemoryUpdate = {
  userPreferences?: Record<string, MemoryPreferenceValue>;
  industry?: string | null;
  accountingMethod?: AccountingMethod | null;
  recurringVendors?: string[];
  customCategories?: string[];
};

export type FinanceQueryMemoryItem = {
  query: string;
  timestamp: string;
};

export type ToolOutputMemoryItem = {
  tool: string;
  output: string;
  timestamp: string;
};

export type ConversationMemory = {
  lastFinanceQueries: FinanceQueryMemoryItem[];
  recentToolOutputs: ToolOutputMemoryItem[];
  updatedAt: string | null;
};

export type ConversationMemoryAppend = {
  query?: string;
  toolOutput?: {
    tool: string;
    output: string;
  };
};
