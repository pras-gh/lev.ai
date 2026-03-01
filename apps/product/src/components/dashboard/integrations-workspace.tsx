"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/design-system";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProviderId
} from "@/lib/integration-catalog";

type IntegrationStatus = "connected" | "error" | "syncing" | "disconnected";

type IntegrationRow = {
  id: string;
  workspace_id: string;
  provider: IntegrationProviderId;
  status: IntegrationStatus;
  last_synced_at: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type IntegrationsResponse = {
  integrations?: IntegrationRow[];
};

type ConnectPayload = {
  provider: IntegrationProviderId;
  credentialToken: string;
  accountLabel: string;
  alertPhone?: string;
  alertWebhookUrl?: string;
  alertCooldownHours?: number;
  proactiveEnabled?: boolean;
};

type SyncPayload = {
  provider: IntegrationProviderId;
};

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

function statusChip(status: IntegrationStatus) {
  if (status === "connected") {
    return {
      label: "Connected",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700"
    };
  }

  if (status === "syncing") {
    return {
      label: "Syncing",
      className: "border-blue-200 bg-blue-50 text-blue-700"
    };
  }

  if (status === "error") {
    return {
      label: "Error",
      className: "border-rose-200 bg-rose-50 text-rose-700"
    };
  }

  return {
    label: "Disconnected",
    className: "border-slate-200 bg-slate-100 text-slate-700"
  };
}

function formatLastSync(value: string | null | undefined): string {
  if (!value) {
    return "Never";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Never";
  }

  return parsed.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function IntegrationsWorkspace() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [drawerProvider, setDrawerProvider] = useState<IntegrationProviderId | null>(null);
  const [credentialToken, setCredentialToken] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [alertPhone, setAlertPhone] = useState("");
  const [alertWebhookUrl, setAlertWebhookUrl] = useState("");
  const [alertCooldownHours, setAlertCooldownHours] = useState("");
  const [proactiveEnabled, setProactiveEnabled] = useState(true);
  const [notice, setNotice] = useState<string>("");

  const workspaceId = searchParams.get("workspaceId");
  const businessId = searchParams.get("businessId") ?? "1";
  const businessIdNumber = Number.parseInt(businessId, 10) || 1;

  const scopeQuery = useMemo(() => {
    if (workspaceId) {
      return `workspaceId=${encodeURIComponent(workspaceId)}`;
    }

    return `businessId=${encodeURIComponent(String(businessIdNumber))}`;
  }, [workspaceId, businessIdNumber]);

  const scopeBody = useMemo(
    () => (workspaceId ? { workspaceId } : { businessId: businessIdNumber }),
    [workspaceId, businessIdNumber]
  );

  const integrationsQuery = useQuery({
    queryKey: ["integrations", scopeQuery],
    queryFn: async () => {
      const response = await fetchWithTimeout(`/api/integrations?${scopeQuery}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to load integrations"));
      }

      const json = (await response.json()) as IntegrationsResponse;
      return json.integrations ?? [];
    },
    retry: false,
    staleTime: 15_000,
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const connectMutation = useMutation({
    mutationFn: async (payload: ConnectPayload) => {
      const response = await fetchWithTimeout("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          provider: payload.provider,
          credentialToken: payload.credentialToken,
          accountLabel: payload.accountLabel,
          alertPhone: payload.alertPhone,
          alertWebhookUrl: payload.alertWebhookUrl,
          alertCooldownHours: payload.alertCooldownHours,
          proactiveEnabled: payload.proactiveEnabled
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(data, "Failed to connect integration"));
      }

      return response.json() as Promise<{ message?: string }>;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setNotice(result.message ?? "Integration connected.");
      setCredentialToken("");
      setAlertPhone("");
      setAlertWebhookUrl("");
      setAlertCooldownHours("");
      setProactiveEnabled(true);
      setDrawerProvider(null);
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to connect integration");
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (payload: SyncPayload) => {
      const response = await fetchWithTimeout("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scopeBody,
          provider: payload.provider,
          rowCount: 6
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(data, "Failed to sync integration"));
      }

      return response.json() as Promise<{ message?: string; job?: { rowsInserted?: number } }>;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["integrations"] }),
        queryClient.invalidateQueries({ queryKey: ["metrics", "health"] })
      ]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ledger:refresh"));
      }
      const rowsInserted = result.job?.rowsInserted ?? 0;
      setNotice(`${result.message ?? "Sync complete"} (${rowsInserted} rows inserted).`);
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to sync integration");
    }
  });

  const integrationMap = useMemo(() => {
    const map = new Map<string, IntegrationRow>();
    for (const row of integrationsQuery.data ?? []) {
      map.set(row.provider, row);
    }
    return map;
  }, [integrationsQuery.data]);
  const integrationsErrorMessage =
    integrationsQuery.error instanceof Error
      ? integrationsQuery.error.message
      : "Failed to load integrations";
  const showInitialLoading = integrationsQuery.isLoading && !integrationsQuery.data;
  const showInitialError = integrationsQuery.isError && !integrationsQuery.data;

  function openConnectDrawer(provider: IntegrationProviderId) {
    setDrawerProvider(provider);
    const current = integrationMap.get(provider);
    const labelFromMeta =
      current?.meta && typeof current.meta.accountLabel === "string"
        ? current.meta.accountLabel
        : "";
    const phoneFromMeta =
      current?.meta && typeof current.meta.alertPhone === "string"
        ? current.meta.alertPhone
        : current?.meta && typeof current.meta.recipientPhone === "string"
          ? current.meta.recipientPhone
          : "";
    const webhookFromMeta =
      current?.meta && typeof current.meta.alertWebhookUrl === "string"
        ? current.meta.alertWebhookUrl
        : current?.meta && typeof current.meta.webhookUrl === "string"
          ? current.meta.webhookUrl
          : "";
    const cooldownFromMeta = current?.meta?.alertCooldownHours;
    const proactiveFromMeta =
      current?.meta && typeof current.meta.proactiveEnabled === "boolean"
        ? current.meta.proactiveEnabled
        : true;

    setAccountLabel(labelFromMeta || "");
    setCredentialToken("");
    setAlertPhone(phoneFromMeta);
    setAlertWebhookUrl(webhookFromMeta);
    setAlertCooldownHours(
      typeof cooldownFromMeta === "number" || typeof cooldownFromMeta === "string"
        ? String(cooldownFromMeta)
        : ""
    );
    setProactiveEnabled(proactiveFromMeta);
  }

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Integrations</h2>
            <p className="mt-1 text-xs text-slate-500">
              Connect providers, sync transactions, and monitor integration health.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                Read-only access
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                Trail never moves money
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                Revoke anytime
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                Every change is audit-logged
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700">
              Demo mode connectors
            </span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
              More providers coming soon
            </span>
          </div>
        </div>

        {notice ? (
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {notice}
          </div>
        ) : null}

        {showInitialLoading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-600">
            Loading integrations...
          </div>
        ) : showInitialError ? (
          <div className="mt-4">
            <ErrorState
              message={integrationsErrorMessage}
              onRetry={() => {
                setNotice("");
                void integrationsQuery.refetch();
              }}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {INTEGRATION_PROVIDERS.map((provider) => {
              const integration = integrationMap.get(provider.id);
              const status = integration?.status ?? "disconnected";
              const chip = statusChip(status);
              const canSync = status === "connected" || status === "syncing" || status === "error";
              const syncIsPending =
                syncMutation.isPending && syncMutation.variables?.provider === provider.id;
              const connectIsPending =
                connectMutation.isPending && connectMutation.variables?.provider === provider.id;

              return (
                <article
                  key={provider.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-slate-900">{provider.label}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${chip.className}`}>
                      {chip.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{provider.blurb}</p>
                  <p className="mt-1 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                    Demo mode connector
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Last sync: {formatLastSync(integration?.last_synced_at)}
                  </p>
                  {provider.id === "whatsapp" ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Last alert send:{" "}
                      {formatLastSync(
                        integration?.meta && typeof integration.meta.lastAlertSentAt === "string"
                          ? integration.meta.lastAlertSentAt
                          : null
                      )}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openConnectDrawer(provider.id)}
                      disabled={connectIsPending}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      {integration ? "Manage" : "Connect"}
                    </button>
                    <button
                      type="button"
                      onClick={() => syncMutation.mutate({ provider: provider.id })}
                      disabled={!canSync || syncIsPending}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      title={canSync ? "Pull latest records" : "Connect first"}
                    >
                      {syncIsPending ? "Syncing..." : "Sync now"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Coming soon</p>
        <p className="mt-1">
          Live OAuth connector flows, incremental webhooks, and scheduled background sync orchestration
          for more providers.
        </p>
      </section>

      {drawerProvider ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-md border-l border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Connect {INTEGRATION_PROVIDERS.find((provider) => provider.id === drawerProvider)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setDrawerProvider(null)}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-medium text-slate-700">Guided setup (MVP)</p>
                <p className="mt-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                  Demo mode connector
                </p>
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>Choose account label</li>
                  <li>Enter credential token placeholder</li>
                  {drawerProvider === "whatsapp" ? <li>Configure alert recipient + webhook</li> : null}
                  <li>Connect and start sync</li>
                </ol>
                <p className="mt-2 text-[11px] text-slate-500">
                  Uses stub credentials and simulated sync rows for demo reliability.
                </p>
                <div className="mt-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-[11px] text-slate-600">
                  <p>Read-only access. Trail never moves money.</p>
                  <p>Revoke anytime from provider settings.</p>
                  <p>Every Trail action is written to audit logs.</p>
                </div>
              </div>

              <label className="block text-xs text-slate-600">
                Account label
                <input
                  value={accountLabel}
                  onChange={(event) => setAccountLabel(event.target.value)}
                  placeholder="Primary account"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                />
              </label>

              <label className="block text-xs text-slate-600">
                Credential token placeholder
                <input
                  value={credentialToken}
                  onChange={(event) => setCredentialToken(event.target.value)}
                  placeholder="token_live_xxxxx"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
                />
              </label>

              <p className="text-[11px] text-slate-500">
                Credentials are stored as masked placeholders in MVP. Full vault-backed secure auth is
                coming soon.
              </p>

              {drawerProvider === "whatsapp" ? (
                <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-medium text-emerald-800">
                    Proactive alert digest setup
                  </p>
                  <label className="block text-xs text-emerald-900">
                    Recipient phone (E.164)
                    <input
                      value={alertPhone}
                      onChange={(event) => setAlertPhone(event.target.value)}
                      placeholder="+919876543210"
                      className="mt-1 w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                  <label className="block text-xs text-emerald-900">
                    Webhook URL (optional if env is set)
                    <input
                      value={alertWebhookUrl}
                      onChange={(event) => setAlertWebhookUrl(event.target.value)}
                      placeholder="https://your-whatsapp-adapter.example/send"
                      className="mt-1 w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                  <label className="block text-xs text-emerald-900">
                    Cooldown hours
                    <input
                      value={alertCooldownHours}
                      onChange={(event) => setAlertCooldownHours(event.target.value)}
                      placeholder="6"
                      className="mt-1 w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-emerald-900">
                    <input
                      type="checkbox"
                      checked={proactiveEnabled}
                      onChange={(event) => setProactiveEnabled(event.target.checked)}
                    />
                    Send proactive daily digest
                  </label>
                  <p className="text-[11px] text-emerald-700">
                    Rich template packs and more messaging channels are coming soon.
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (!drawerProvider) {
                    return;
                  }

                  const isWhatsApp = drawerProvider === "whatsapp";
                  const cooldownCandidate = alertCooldownHours.trim();
                  const parsedCooldown =
                    isWhatsApp && cooldownCandidate
                      ? Number(cooldownCandidate)
                      : undefined;
                  if (
                    parsedCooldown !== undefined &&
                    (!Number.isFinite(parsedCooldown) || parsedCooldown < 0)
                  ) {
                    setNotice("Cooldown hours must be a non-negative number.");
                    return;
                  }

                  connectMutation.mutate({
                    provider: drawerProvider,
                    credentialToken: credentialToken || "coming_soon_placeholder",
                    accountLabel:
                      accountLabel ||
                      INTEGRATION_PROVIDERS.find((provider) => provider.id === drawerProvider)
                        ?.label ||
                      "Primary",
                    alertPhone: isWhatsApp ? alertPhone.trim() || undefined : undefined,
                    alertWebhookUrl: isWhatsApp ? alertWebhookUrl.trim() || undefined : undefined,
                    alertCooldownHours: parsedCooldown,
                    proactiveEnabled: isWhatsApp ? proactiveEnabled : undefined
                  });
                }}
                disabled={connectMutation.isPending}
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {connectMutation.isPending ? "Connecting..." : "Connect integration"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
