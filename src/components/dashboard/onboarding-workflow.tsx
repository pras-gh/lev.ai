"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import Papa from "papaparse";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import { formatInr } from "@/lib/formatters";
import { OnboardingIntegrationsStep } from "@/components/dashboard/onboarding-integrations-step";

type WorkspaceItem = {
  id: string;
  name: string;
  businessId: number;
  businessName: string;
  role: string;
  status: string;
};

type ScopeState = {
  workspaceId: string;
  businessId: number;
  workspaceName: string;
  businessName: string;
};

type UploadResponse = {
  parsed?: {
    totalRows?: number;
    normalizedRows?: number;
    rejectedRows?: number;
  };
  insert?: {
    inserted?: number;
    duplicateInPayload?: number;
    skippedExisting?: number;
    duplicateSuggestionsOpen?: number;
    ruleSuggestedTagCount?: number;
  };
  rejectedPreview?: Array<{
    row: number;
    reason: string;
  }>;
};

type RulesResponse = {
  result?: Record<string, unknown>;
};

type ReconcileResponse = {
  scanned?: number;
  suggestions?: number;
  updatedRows?: number;
  clearedRows?: number;
};

type AlertsRunResponse = {
  mode?: string;
  result?: Record<string, unknown>;
  summary?: {
    scannedWorkspaces?: number;
    successCount?: number;
    failureCount?: number;
  };
  controlPlane?: Record<string, unknown>;
};

type MonthlySummaryResponse = {
  month?: string;
  monthLabel?: string;
  metrics?: {
    revenue?: number;
    expenses?: number;
    profitEstimate?: number;
    gstPayableEstimate?: number;
    safeToSpendCash?: number;
  };
};

type OnboardingStatusResponse = {
  onboarding?: {
    completed?: boolean;
    completedAt?: string | null;
  };
  workspace?: {
    id?: string;
    businessId?: number;
  } | null;
};

type CsvPreviewRow = Record<string, string | number | boolean | null>;

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  return fallback;
}

function normalizeCsvValue(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return String(value);
}

function buildScopeLabel(scope: ScopeState | null): string {
  if (!scope) {
    return "No workspace selected";
  }

  return `${scope.workspaceName} • ${scope.businessName} (#${scope.businessId})`;
}

function StepCard({
  index,
  title,
  description,
  complete,
  children
}: {
  index: number;
  title: string;
  description: string;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/12 bg-black/45 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {complete ? (
            <CheckCircle2 className="h-5 w-5 text-zinc-100" />
          ) : (
            <Circle className="h-5 w-5 text-zinc-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Step {index}</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-100">{title}</h2>
          <p className="mt-1 text-xs text-zinc-400">{description}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </article>
  );
}

type OnboardingWorkflowProps = {
  initialBusinessName?: string;
  initialWorkspaceName?: string;
};

export function OnboardingWorkflow({
  initialBusinessName,
  initialWorkspaceName
}: OnboardingWorkflowProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [scope, setScope] = useState<ScopeState | null>(null);
  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [workspaceName, setWorkspaceName] = useState(
    initialWorkspaceName ?? initialBusinessName ?? ""
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [alertEngineKey, setAlertEngineKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [integrationStepConnected, setIntegrationStepConnected] = useState(false);
  const [integrationStepSkipped, setIntegrationStepSkipped] = useState(false);
  const [automationResult, setAutomationResult] = useState<{
    rules: RulesResponse;
    reconcile: ReconcileResponse;
  } | null>(null);
  const [alertsResult, setAlertsResult] = useState<AlertsRunResponse | null>(null);
  const [reportResult, setReportResult] = useState<MonthlySummaryResponse | null>(null);

  const workspaceQuery = useQuery({
    queryKey: ["onboarding", "workspaces"],
    queryFn: async () => {
      const response = await fetch("/api/workspaces", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to load workspaces"));
      }

      const data = (await response.json()) as {
        workspaces?: WorkspaceItem[];
      };
      return data.workspaces ?? [];
    },
    staleTime: 30_000
  });

  const workspaceOptions = workspaceQuery.data ?? [];
  const initialWorkspaceId = searchParams.get("workspaceId");

  useEffect(() => {
    if (!workspaceOptions.length) {
      return;
    }

    if (scope) {
      return;
    }

    if (initialWorkspaceId) {
      const existing = workspaceOptions.find((item) => item.id === initialWorkspaceId);
      if (existing) {
        setSelectedWorkspaceId(existing.id);
        setScope({
          workspaceId: existing.id,
          businessId: existing.businessId,
          workspaceName: existing.name,
          businessName: existing.businessName
        });
        return;
      }
    }

    setSelectedWorkspaceId((current) => current || workspaceOptions[0].id);
  }, [initialWorkspaceId, scope, workspaceOptions]);

  function applyScope(nextScope: ScopeState) {
    setScope(nextScope);
    setNotice(`Workspace selected: ${nextScope.workspaceName}`);

    const next = new URLSearchParams(searchParams.toString());
    next.set("workspaceId", nextScope.workspaceId);
    next.set("businessId", String(nextScope.businessId));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const selectWorkspaceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWorkspaceId) {
        throw new Error("Select a workspace first");
      }

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: selectedWorkspaceId })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to select workspace"));
      }

      return response.json() as Promise<{
        workspace: WorkspaceItem;
      }>;
    },
    onSuccess: (data) => {
      applyScope({
        workspaceId: data.workspace.id,
        businessId: data.workspace.businessId,
        workspaceName: data.workspace.name,
        businessName: data.workspace.businessName
      });
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to select workspace");
    }
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          workspaceName
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to create workspace"));
      }

      return response.json() as Promise<{
        workspace: WorkspaceItem;
        created: boolean;
      }>;
    },
    onSuccess: (data) => {
      const createdScope = {
        workspaceId: data.workspace.id,
        businessId: data.workspace.businessId,
        workspaceName: data.workspace.name,
        businessName: data.workspace.businessName
      };
      applyScope(createdScope);
      setBusinessName("");
      setWorkspaceName("");
      workspaceQuery.refetch();
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to create workspace");
    }
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!scope) {
        throw new Error("Select a workspace before import");
      }

      if (!csvContent.trim()) {
        throw new Error("Upload a CSV file first");
      }

      const response = await fetch("/api/transactions/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: scope.workspaceId,
          csv: csvContent,
          source: "csv_import"
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to import CSV"));
      }

      return response.json() as Promise<UploadResponse>;
    },
    onSuccess: (data) => {
      setUploadResult(data);
      const inserted = data.insert?.inserted ?? 0;
      setNotice(`CSV imported successfully: ${inserted} rows inserted.`);
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to import CSV");
    }
  });

  const automateMutation = useMutation({
    mutationFn: async () => {
      if (!scope) {
        throw new Error("Select a workspace before auto-categorize");
      }

      const rulesResponse = await fetch("/api/rules/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: scope.workspaceId,
          limit: 1500,
          confidenceThreshold: 0.65
        })
      });

      if (!rulesResponse.ok) {
        const payload = await rulesResponse.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Auto-categorize failed"));
      }

      const rules = (await rulesResponse.json()) as RulesResponse;

      const reconcileResponse = await fetch("/api/transactions/reconcile/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: scope.workspaceId,
          limit: 600,
          maxDateWindowDays: 3,
          confidenceThreshold: 0.6
        })
      });

      if (!reconcileResponse.ok) {
        const payload = await reconcileResponse.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Reconciliation suggestion run failed"));
      }

      const reconcile = (await reconcileResponse.json()) as ReconcileResponse;
      return { rules, reconcile };
    },
    onSuccess: (data) => {
      setAutomationResult(data);
      setNotice("Auto-categorize and reconciliation suggestions completed.");
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Automation step failed");
    }
  });

  const alertsMutation = useMutation({
    mutationFn: async () => {
      if (!scope) {
        throw new Error("Select a workspace before computing alerts");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (alertEngineKey.trim()) {
        headers["x-alert-engine-key"] = alertEngineKey.trim();
      }

      const response = await fetch("/api/jobs/alerts/daily", {
        method: "POST",
        headers,
        body: JSON.stringify({
          workspaceId: scope.workspaceId,
          sendWhatsAppDigest: false
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to compute alerts"));
      }

      return response.json() as Promise<AlertsRunResponse>;
    },
    onSuccess: (data) => {
      setAlertsResult(data);
      setNotice("Alerts computed successfully.");
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Alerts computation failed");
    }
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!scope) {
        throw new Error("Select a workspace before report generation");
      }

      const params = new URLSearchParams();
      params.set("workspaceId", scope.workspaceId);
      params.set("month", month);
      params.set("format", "json");

      const response = await fetch(`/api/reports/monthly?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to generate monthly report"));
      }

      return response.json() as Promise<MonthlySummaryResponse>;
    },
    onSuccess: (data) => {
      setReportResult(data);
      setNotice("Monthly summary generated.");
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Monthly report generation failed");
    }
  });

  const finishOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!scope) {
        throw new Error("Select a workspace before finishing onboarding");
      }

      const response = await fetch("/api/onboarding/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: scope.workspaceId,
          complete: true
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to complete onboarding"));
      }

      return response.json() as Promise<OnboardingStatusResponse>;
    },
    onSuccess: (data) => {
      if (!scope) {
        return;
      }

      const workspaceId =
        typeof data.workspace?.id === "string" ? data.workspace.id : scope.workspaceId;
      const businessId =
        typeof data.workspace?.businessId === "number"
          ? data.workspace.businessId
          : scope.businessId;

      setNotice("Onboarding completed. Redirecting to dashboard...");

      const next = new URLSearchParams();
      next.set("workspaceId", workspaceId);
      next.set("businessId", String(businessId));
      router.replace(`/app/dashboard?${next.toString()}`);
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to complete onboarding");
    }
  });

  function onCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setUploadResult(null);
    setNotice(null);

    void file.text().then((text) => {
      setCsvContent(text);

      Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        preview: 8,
        complete: (result) => {
          const headers = result.meta.fields ?? [];
          const rows = (result.data ?? []).slice(0, 6).map((row) => {
            const normalizedRow: CsvPreviewRow = {};
            for (const header of headers) {
              normalizedRow[header] = normalizeCsvValue(row[header]);
            }
            return normalizedRow;
          });
          setCsvHeaders(headers.slice(0, 8));
          setCsvPreview(rows);
        }
      });
    });

    event.target.value = "";
  }

  function openHtmlReport() {
    if (!scope) {
      setNotice("Select a workspace before opening report HTML.");
      return;
    }

    const url = `/api/reports/monthly/${month}?workspaceId=${encodeURIComponent(scope.workspaceId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const step1Done = Boolean(scope);
  const step2Done = Boolean(uploadResult);
  const step3Done = integrationStepConnected || integrationStepSkipped;
  const step4Done = Boolean(automationResult);
  const step5Done = Boolean(alertsResult);
  const step6Done = Boolean(reportResult);

  const progress = [step1Done, step2Done, step3Done, step4Done, step5Done, step6Done].filter(
    Boolean
  ).length;

  const selectedWorkspaceOption = useMemo(
    () => workspaceOptions.find((item) => item.id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaceOptions]
  );

  return (
    <section className="space-y-4">
      <header className="rounded-[24px] border border-white/12 bg-zinc-950/88 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="ui-label">Guided onboarding</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
              One guided path for internal rollout
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Create/select workspace → upload CSV preview/import → connect integrations →
              auto-categorize + reconcile suggestions → compute alerts → generate monthly report.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Progress</p>
            <p className="mt-1 text-xl font-semibold text-zinc-100">{progress}/6</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">{buildScopeLabel(scope)}</p>
      </header>

      {notice ? (
        <div className="rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-xs text-zinc-200">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-3">
        <StepCard
          index={1}
          title="Create workspace (or select)"
          description="Pick an existing workspace membership or create a new workspace for a fresh business."
          complete={step1Done}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs font-medium text-zinc-300">Select existing workspace</p>
              {workspaceQuery.isLoading ? (
                <p className="mt-2 text-xs text-zinc-500">Loading workspaces...</p>
              ) : workspaceQuery.isError ? (
                <p className="mt-2 text-xs text-zinc-400">
                  {workspaceQuery.error instanceof Error
                    ? workspaceQuery.error.message
                    : "Failed to load workspaces"}
                </p>
              ) : workspaceOptions.length > 0 ? (
                <>
                  <select
                    value={selectedWorkspaceId}
                    onChange={(event) => setSelectedWorkspaceId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/12 bg-black/55 px-2 py-2 text-xs text-zinc-100"
                  >
                    {workspaceOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} • {item.businessName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => selectWorkspaceMutation.mutate()}
                    disabled={selectWorkspaceMutation.isPending || !selectedWorkspaceId}
                    className="mt-2 rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
                  >
                    {selectWorkspaceMutation.isPending ? "Selecting..." : "Use selected workspace"}
                  </button>
                </>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
                  No active workspace memberships found for this account yet.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs font-medium text-zinc-300">Create new workspace</p>
              <input
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Business name (required)"
                className="mt-2 w-full rounded-lg border border-white/12 bg-black/55 px-2 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
              />
              <input
                type="text"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Workspace name (optional)"
                className="mt-2 w-full rounded-lg border border-white/12 bg-black/55 px-2 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => createWorkspaceMutation.mutate()}
                disabled={createWorkspaceMutation.isPending || businessName.trim().length === 0}
                className="mt-2 rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
              >
                {createWorkspaceMutation.isPending ? "Creating..." : "Create workspace"}
              </button>
            </div>
          </div>

          {selectedWorkspaceOption ? (
            <p className="mt-2 text-xs text-zinc-500">
              Selected: {selectedWorkspaceOption.name} • {selectedWorkspaceOption.businessName}
            </p>
          ) : null}
        </StepCard>

        <StepCard
          index={2}
          title="Upload CSV → preview → import"
          description="Upload a bank CSV, inspect first rows, then import into transactions."
          complete={step2Done}
        >
          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12">
                Choose CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={onCsvFile} />
              </label>
              {fileName ? <p className="text-xs text-zinc-400">{fileName}</p> : null}
              <button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={!scope || !csvContent || importMutation.isPending}
                className="rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
              >
                {importMutation.isPending ? "Importing..." : "Import CSV"}
              </button>
            </div>

            {csvHeaders.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-lg border border-white/10">
                <table className="min-w-full border-collapse text-left text-xs text-zinc-200">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-zinc-400">
                      {csvHeaders.map((header) => (
                        <th key={header} className="px-2 py-2 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, idx) => (
                      <tr key={`${idx}-${fileName ?? "csv"}`} className="border-b border-white/5">
                        {csvHeaders.map((header) => (
                          <td key={`${idx}-${header}`} className="px-2 py-1.5 text-zinc-300">
                            {row[header] === null ? "-" : String(row[header])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {uploadResult ? (
              <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  Parsed rows: {uploadResult.parsed?.totalRows ?? 0}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  Normalized: {uploadResult.parsed?.normalizedRows ?? 0}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  Inserted: {uploadResult.insert?.inserted ?? 0}
                </div>
              </div>
            ) : null}
          </div>
        </StepCard>

        <StepCard
          index={3}
          title="Connect your tools"
          description="Connect once and let Trail sync forever. Best results with integrations."
          complete={step3Done}
        >
          <OnboardingIntegrationsStep
            scope={scope ? { workspaceId: scope.workspaceId, businessId: scope.businessId } : null}
            onCompletionChange={(done) => {
              setIntegrationStepConnected(done);
              if (done) {
                setIntegrationStepSkipped(false);
              }
            }}
            onSkip={() => {
              setIntegrationStepSkipped(true);
              setNotice("Integration step skipped. You can connect providers later from Integrations.");
            }}
          />
        </StepCard>

        <StepCard
          index={4}
          title="Auto-categorize + suggest reconcile"
          description="Run categorization rules and reconciliation suggestion engine in one batch."
          complete={step4Done}
        >
          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <button
              type="button"
              onClick={() => automateMutation.mutate()}
              disabled={!scope || automateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
            >
              {automateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Run auto-clean pipeline
                </>
              )}
            </button>

            {automationResult ? (
              <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  <p className="font-medium text-zinc-200">Categorization</p>
                  <pre className="mt-2 overflow-auto text-[11px] text-zinc-400">
                    {JSON.stringify(automationResult.rules.result ?? {}, null, 2)}
                  </pre>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  <p className="font-medium text-zinc-200">Reconciliation suggestions</p>
                  <p className="mt-2">Scanned: {automationResult.reconcile.scanned ?? 0}</p>
                  <p>Suggested pairs: {automationResult.reconcile.suggestions ?? 0}</p>
                  <p>Rows updated: {automationResult.reconcile.updatedRows ?? 0}</p>
                </div>
              </div>
            ) : null}
          </div>
        </StepCard>

        <StepCard
          index={5}
          title="Compute alerts (daily job endpoint)"
          description="Trigger the daily alert evaluator for current workspace."
          complete={step5Done}
        >
          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <input
              type="password"
              value={alertEngineKey}
              onChange={(event) => setAlertEngineKey(event.target.value)}
              placeholder="Alert engine key (optional)"
              className="w-full rounded-lg border border-white/12 bg-black/55 px-2 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => alertsMutation.mutate()}
              disabled={!scope || alertsMutation.isPending}
              className="mt-2 rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
            >
              {alertsMutation.isPending ? "Computing..." : "Compute alerts now"}
            </button>

            {alertsResult ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-zinc-300">
                <p>Mode: {alertsResult.mode ?? "workspace"}</p>
                {"summary" in (alertsResult ?? {}) && alertsResult.summary ? (
                  <p>
                    Summary: {alertsResult.summary.successCount ?? 0} success /{" "}
                    {alertsResult.summary.failureCount ?? 0} failed
                  </p>
                ) : (
                  <p>Workspace alert evaluation completed.</p>
                )}
              </div>
            ) : null}
          </div>
        </StepCard>

        <StepCard
          index={6}
          title="Generate monthly report"
          description="Generate monthly summary JSON and open the one-page HTML output."
          complete={step6Done}
        >
          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-lg border border-white/12 bg-black/55 px-2 py-2 text-xs text-zinc-100"
              />
              <button
                type="button"
                onClick={() => reportMutation.mutate()}
                disabled={!scope || reportMutation.isPending}
                className="rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
              >
                {reportMutation.isPending ? "Generating..." : "Generate report (JSON)"}
              </button>
              <button
                type="button"
                onClick={openHtmlReport}
                disabled={!scope}
                className="rounded-lg border border-white/20 bg-white/8 px-3 py-2 text-xs text-zinc-100 hover:bg-white/12 disabled:opacity-60"
              >
                Open HTML report
              </button>
            </div>

            {reportResult?.metrics ? (
              <div className="mt-3 grid gap-2 text-xs text-zinc-300 md:grid-cols-5">
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  Revenue: {formatInr(reportResult.metrics.revenue ?? 0, { maximumFractionDigits: 2 })}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  Expenses: {formatInr(reportResult.metrics.expenses ?? 0, { maximumFractionDigits: 2 })}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  Profit:{" "}
                  {formatInr(reportResult.metrics.profitEstimate ?? 0, {
                    maximumFractionDigits: 2,
                    signed: true
                  })}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  GST payable:{" "}
                  {formatInr(reportResult.metrics.gstPayableEstimate ?? 0, {
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  Safe-to-spend:{" "}
                  {formatInr(reportResult.metrics.safeToSpendCash ?? 0, {
                    maximumFractionDigits: 2
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </StepCard>
      </div>

      <footer className="rounded-2xl border border-white/12 bg-zinc-950/88 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Unlock dashboard access</p>
            <p className="mt-1 text-xs text-zinc-400">
              Once completed, users land directly in dashboard on next login.
            </p>
          </div>
          <button
            type="button"
            onClick={() => finishOnboardingMutation.mutate()}
            disabled={!scope || finishOnboardingMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {finishOnboardingMutation.isPending ? "Finalizing..." : "Complete onboarding and enter dashboard"}
          </button>
        </div>
      </footer>
    </section>
  );
}
