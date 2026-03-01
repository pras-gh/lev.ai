"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Link2,
  Lock,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import type { IntegrationProviderId } from "@/lib/integration-catalog";

type ScopeInput = {
  workspaceId: string;
  businessId: number;
} | null;

type IntegrationStatus = "connected" | "error" | "syncing" | "disconnected";

type IntegrationRow = {
  provider: IntegrationProviderId;
  status: IntegrationStatus;
  last_synced_at: string | null;
  meta?: Record<string, unknown> | null;
  updated_at: string;
};

type IntegrationsResponse = {
  integrations?: IntegrationRow[];
};

type BucketItem = {
  id: string;
  label: string;
  tooltip: string;
  iconSrc?: string;
  provider?: IntegrationProviderId;
  comingSoon?: boolean;
};

const PROVIDER_LABELS: Record<IntegrationProviderId, string> = {
  hdfc: "HDFC Bank",
  icici: "ICICI Bank",
  razorpay: "Razorpay",
  gpay: "UPI",
  stripe: "Stripe",
  tally: "Tally",
  whatsapp: "WhatsApp",
  zohobooks: "Zoho Books"
};

const BUCKETS: Array<{ id: string; title: string; subtitle: string; items: BucketItem[] }> = [
  {
    id: "payments",
    title: "Money In / Out",
    subtitle: "Bank, UPI, Razorpay, Stripe",
    items: [
      {
        id: "hdfc",
        label: "HDFC",
        provider: "hdfc",
        iconSrc: "/integrations/hdfc-bank-logo.svg",
        tooltip: "HDFC Bank - statements, balances, and debit/credit sync"
      },
      {
        id: "icici",
        label: "ICICI",
        provider: "icici",
        iconSrc: "/integrations/icici.svg",
        tooltip: "ICICI Bank - account feed sync"
      },
      {
        id: "upi",
        label: "UPI",
        provider: "gpay",
        iconSrc: "/integrations/upi.svg",
        tooltip: "UPI - collections and payouts"
      },
      {
        id: "razorpay",
        label: "Razorpay",
        provider: "razorpay",
        iconSrc: "/integrations/razorpay.svg",
        tooltip: "Razorpay - payouts + fees synced"
      },
      {
        id: "stripe",
        label: "Stripe",
        provider: "stripe",
        iconSrc: "/integrations/stripe.svg",
        tooltip: "Stripe - payout and fee events"
      }
    ]
  },
  {
    id: "systems",
    title: "Books + Commerce",
    subtitle: "Zoho, Tally, Shopify, Amazon, GST invoices",
    items: [
      {
        id: "zohobooks",
        label: "Zoho",
        provider: "zohobooks",
        iconSrc: "/integrations/zohobooks.svg",
        tooltip: "Zoho Books - invoices and vouchers"
      },
      {
        id: "tally",
        label: "Tally",
        provider: "tally",
        iconSrc: "/integrations/tally.svg",
        tooltip: "Tally - ledger bridge sync"
      },
      {
        id: "shopify",
        label: "Shopify",
        iconSrc: "/integrations/shopify.svg",
        tooltip: "Shopify - orders and payouts",
        comingSoon: true
      },
      {
        id: "amazon",
        label: "Amazon",
        iconSrc: "/integrations/amazon.svg",
        tooltip: "Amazon marketplace settlements",
        comingSoon: true
      },
      {
        id: "gst",
        label: "GST Invoices",
        iconSrc: "/integrations/gst.svg",
        tooltip: "GST invoice ingestion",
        comingSoon: true
      }
    ]
  },
  {
    id: "delivery",
    title: "Where Trail Shows Up",
    subtitle: "WhatsApp, Slack, Email",
    items: [
      {
        id: "whatsapp",
        label: "WhatsApp",
        provider: "whatsapp",
        iconSrc: "/integrations/whatsapp.svg",
        tooltip: "WhatsApp proactive alerts + summaries"
      },
      {
        id: "slack",
        label: "Slack",
        iconSrc: "/integrations/slack.svg",
        tooltip: "Slack alert routing",
        comingSoon: true
      },
      {
        id: "email",
        label: "Email",
        iconSrc: "/integrations/email.svg",
        tooltip: "Email report delivery",
        comingSoon: true
      }
    ]
  }
];

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

function minutesAgo(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diffMs / 60_000));
}

function integrationHealth(
  row: IntegrationRow | undefined
): {
  chip: string;
  detail: string;
  tone: "healthy" | "connected" | "syncing" | "needs_attention" | "disconnected";
} {
  if (!row) {
    return {
      chip: "Disconnected",
      detail: "Not connected yet",
      tone: "disconnected"
    };
  }

  if (row.status === "error") {
    return {
      chip: "⚠️ Needs attention",
      detail: "Token expired or permission missing",
      tone: "needs_attention"
    };
  }

  if (row.status === "syncing") {
    const mins = minutesAgo(row.last_synced_at);
    return {
      chip: "🔄 Syncing",
      detail: mins === null ? "Sync in progress" : `Last synced ${mins} min ago`,
      tone: "syncing"
    };
  }

  if (row.status === "connected") {
    const mins = minutesAgo(row.last_synced_at);
    if (mins !== null && mins <= 20) {
      return {
        chip: "🟢 Healthy",
        detail: "Webhooks active, delta sync running",
        tone: "healthy"
      };
    }

    return {
      chip: "✅ Connected",
      detail: mins === null ? "Connected" : `Last synced ${mins} min ago`,
      tone: "connected"
    };
  }

  return {
    chip: "Disconnected",
    detail: "Not connected yet",
    tone: "disconnected"
  };
}

function statusClassName(
  tone: "healthy" | "connected" | "syncing" | "needs_attention" | "disconnected"
): string {
  if (tone === "healthy") {
    return "border-emerald-300/40 bg-emerald-500/10 text-emerald-200";
  }
  if (tone === "connected") {
    return "border-cyan-300/40 bg-cyan-500/10 text-cyan-200";
  }
  if (tone === "syncing") {
    return "border-blue-300/40 bg-blue-500/10 text-blue-200";
  }
  if (tone === "needs_attention") {
    return "border-amber-300/40 bg-amber-500/10 text-amber-200";
  }
  return "border-zinc-700 bg-zinc-900/80 text-zinc-400";
}

function FlowFieldStream({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let rafId = 0;
    let frame = 0;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      speed: 0.4 + Math.random() * 1.2,
      radius: 0.8 + Math.random() * 1.5
    }));

    const animate = () => {
      frame += 1;

      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      context.globalCompositeOperation = "lighter";

      for (const particle of particles) {
        const angle =
          Math.sin((particle.y + frame * 0.8) * 0.01) +
          Math.cos((particle.x - frame * 0.6) * 0.013);

        particle.x += Math.cos(angle) * particle.speed;
        particle.y += Math.sin(angle) * particle.speed;

        if (particle.x < -10) particle.x = canvas.clientWidth + 10;
        if (particle.x > canvas.clientWidth + 10) particle.x = -10;
        if (particle.y < -10) particle.y = canvas.clientHeight + 10;
        if (particle.y > canvas.clientHeight + 10) particle.y = -10;

        context.beginPath();
        context.fillStyle = "rgba(255,255,255,0.28)";
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalCompositeOperation = "source-over";
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl opacity-45"
      aria-hidden="true"
    />
  );
}

export function OnboardingIntegrationsStep(props: {
  scope: ScopeInput;
  onCompletionChange?: (done: boolean) => void;
  onSkip?: () => void;
}) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProviderId | null>(null);
  const [activeBeamId, setActiveBeamId] = useState<string | null>(null);

  const scopeQuery = useMemo(() => {
    if (!props.scope) {
      return null;
    }

    return `workspaceId=${encodeURIComponent(props.scope.workspaceId)}`;
  }, [props.scope]);

  const integrationsQuery = useQuery({
    queryKey: ["onboarding", "integrations", scopeQuery],
    queryFn: async () => {
      if (!scopeQuery) {
        return [];
      }

      const response = await fetchWithTimeout(`/api/integrations?${scopeQuery}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to load integrations"));
      }

      const data = (await response.json()) as IntegrationsResponse;
      return data.integrations ?? [];
    },
    enabled: Boolean(scopeQuery),
    staleTime: 15_000,
    refetchInterval: scopeQuery ? 20_000 : false,
    refetchIntervalInBackground: true,
    placeholderData: (previous) => previous
  });

  const integrationMap = useMemo(() => {
    const map = new Map<IntegrationProviderId, IntegrationRow>();
    for (const row of integrationsQuery.data ?? []) {
      map.set(row.provider, row);
    }
    return map;
  }, [integrationsQuery.data]);

  const connectedCount = useMemo(() => {
    let count = 0;
    for (const row of integrationsQuery.data ?? []) {
      if (row.status === "connected" || row.status === "syncing") {
        count += 1;
      }
    }
    return count;
  }, [integrationsQuery.data]);

  useEffect(() => {
    props.onCompletionChange?.(connectedCount > 0);
  }, [connectedCount, props]);

  const connectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderId) => {
      if (!props.scope) {
        throw new Error("Select workspace first");
      }

      const response = await fetchWithTimeout("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: props.scope.workspaceId,
          provider,
          credentialToken: "guided_connect_placeholder",
          accountLabel: PROVIDER_LABELS[provider]
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to connect integration"));
      }

      return response.json() as Promise<{ message?: string }>;
    },
    onSuccess: async (payload, provider) => {
      setNotice(payload.message ?? `${PROVIDER_LABELS[provider]} connected.`);
      await queryClient.invalidateQueries({ queryKey: ["onboarding", "integrations"] });
      syncMutation.mutate(provider);
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to connect integration");
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderId) => {
      if (!props.scope) {
        throw new Error("Select workspace first");
      }

      const response = await fetchWithTimeout("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: props.scope.workspaceId,
          provider,
          rowCount: 6
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseErrorMessage(payload, "Failed to sync integration"));
      }

      return response.json() as Promise<{ message?: string; job?: { rowsInserted?: number } }>;
    },
    onSuccess: async (payload, provider) => {
      const inserted = payload.job?.rowsInserted ?? 0;
      setNotice(`${PROVIDER_LABELS[provider]} synced (${inserted} rows).`);
      await queryClient.invalidateQueries({ queryKey: ["onboarding", "integrations"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ledger:refresh"));
      }
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Failed to sync integration");
    }
  });

  const modalStatus = selectedProvider
    ? integrationHealth(integrationMap.get(selectedProvider))
    : null;

  const isBusy = connectMutation.isPending || syncMutation.isPending;

  function triggerBeam(itemId: string) {
    setActiveBeamId(itemId);
    window.setTimeout(() => setActiveBeamId((current) => (current === itemId ? null : current)), 650);
  }

  function handleProviderTap(item: BucketItem) {
    triggerBeam(item.id);

    if (item.comingSoon || !item.provider) {
      setNotice(`${item.label} connector is coming soon.`);
      return;
    }

    setSelectedProvider(item.provider);
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-4">
        <FlowFieldStream active={true} />
        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Screen 3 - Integrations</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">
            Connect once - trai\ runs forever
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            Best results with integrations. Trail syncs continuously in the background.
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Read-only access. Trail never moves money. Revoke anytime. Every Trail action is audit-logged.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative inline-flex">
              <span className="pointer-events-none absolute -left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-300/80 animate-pulse" />
              <span className="pointer-events-none absolute -right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-300/80 animate-pulse" />
              <button
                type="button"
                onClick={() => setSelectedProvider("hdfc")}
                disabled={!props.scope}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/15 disabled:opacity-60"
              >
                <Wrench className="h-3.5 w-3.5" />
                Connect your tools
              </button>
            </div>

            <button
              type="button"
              onClick={() => props.onSkip?.()}
              className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-xs text-zinc-300 hover:bg-white/10"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-200">
          {notice}
        </div>
      ) : null}

      {!props.scope ? (
        <div className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Select or create a workspace in Step 1 to connect integrations.
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-3">
        {BUCKETS.map((bucket) => (
          <article key={bucket.id} className="rounded-2xl border border-white/10 bg-black/35 p-3">
            <p className="text-xs font-semibold text-zinc-100">{bucket.title}</p>
            <p className="mt-1 text-[11px] text-zinc-500">{bucket.subtitle}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {bucket.items.map((item) => {
                const integration = item.provider ? integrationMap.get(item.provider) : undefined;
                const health = integrationHealth(integration);
                const isConnected =
                  integration?.status === "connected" || integration?.status === "syncing";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProviderTap(item)}
                    className="group relative overflow-hidden rounded-xl border border-white/12 bg-zinc-900/70 px-2 py-2 text-left transition-transform hover:scale-[1.02]"
                  >
                    <span className="absolute right-2 top-2 text-[10px] text-zinc-500">
                      {item.comingSoon ? "Soon" : <CircleHelp className="h-3 w-3" />}
                    </span>

                    {activeBeamId === item.id ? (
                      <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent animate-pulse" />
                    ) : null}

                    <div className="flex items-center gap-2">
                      {item.iconSrc ? (
                        <img
                          src={item.iconSrc}
                          alt={item.label}
                          className="h-7 w-7 rounded-md bg-white object-contain p-0.5"
                        />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[10px] text-zinc-200">
                          {item.label.slice(0, 2)}
                        </span>
                      )}
                      <span className="text-xs font-medium text-zinc-100">{item.label}</span>
                    </div>

                    <p className="mt-2 text-[10px] text-zinc-400">{health.chip}</p>

                    {isConnected ? (
                      <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-200">
                        <Lock className="h-2.5 w-2.5" />
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      </span>
                    ) : null}

                    <div className="pointer-events-none absolute inset-x-1 bottom-1 z-20 rounded border border-zinc-700 bg-zinc-950/95 px-1.5 py-1 text-[10px] text-zinc-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      {item.tooltip}
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/35 p-3 text-xs text-zinc-300">
        Connected providers: {connectedCount}
      </div>

      {selectedProvider ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 px-4 py-8">
          <div className="relative w-full max-w-5xl rounded-[28px] border border-white/12 bg-zinc-950 p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Integration Access
                </p>
                <h4 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
                  {PROVIDER_LABELS[selectedProvider]} {"->"} Trail Sync Engine
                </h4>
                <p className="mt-2 text-sm text-zinc-400">
                  We&apos;ll sync in the background. No manual exports.
                </p>
                <p className="text-sm text-zinc-400">
                  Read-only access. Trail never moves money. Revoke anytime.
                </p>
                <p className="text-sm text-zinc-500">
                  Audit trail enabled for categorization, matching, alerts, and reversals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="relative mt-6 rounded-2xl border border-white/10 bg-black/45 p-4">
              <div className="absolute left-1/2 top-1/2 hidden h-px w-[68%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-white/10 via-cyan-300/60 to-white/10 md:block" />
              <div className="pointer-events-none absolute left-[18%] top-1/2 hidden h-1 w-14 -translate-y-1/2 rounded-full bg-cyan-300/70 blur-sm md:block animate-pulse" />
              <div className="pointer-events-none absolute right-[18%] top-1/2 hidden h-1 w-14 -translate-y-1/2 rounded-full bg-emerald-300/70 blur-sm md:block animate-pulse" />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/12 bg-zinc-900/70 p-3 text-center">
                  <img
                    src={
                      BUCKETS.flatMap((bucket) => bucket.items).find(
                        (entry) => entry.provider === selectedProvider
                      )?.iconSrc ?? "/integrations/upi.svg"
                    }
                    alt={PROVIDER_LABELS[selectedProvider]}
                    className="mx-auto h-10 w-10 rounded-lg bg-white p-1 object-contain"
                  />
                  <p className="mt-2 text-xs text-zinc-200">{PROVIDER_LABELS[selectedProvider]}</p>
                </div>

                <div className="rounded-xl border border-cyan-300/35 bg-cyan-500/10 p-3 text-center">
                  <Link2 className="mx-auto h-7 w-7 text-cyan-200" />
                  <p className="mt-2 text-xs text-cyan-100">Trail Sync Engine</p>
                </div>

                <div className="rounded-xl border border-emerald-300/35 bg-emerald-500/10 p-3 text-center">
                  <ShieldCheck className="mx-auto h-7 w-7 text-emerald-200" />
                  <p className="mt-2 text-xs text-emerald-100">Live Ledger</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs ${modalStatus ? statusClassName(modalStatus.tone) : "border-zinc-700 bg-zinc-900 text-zinc-400"}`}
              >
                {modalStatus?.chip ?? "Disconnected"}
              </span>
              <span className="text-xs text-zinc-400">{modalStatus?.detail ?? "Not connected yet"}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => connectMutation.mutate(selectedProvider)}
                disabled={!props.scope || isBusy}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/15 disabled:opacity-60"
              >
                {connectMutation.isPending ? "Connecting..." : "Connect"}
              </button>
              <button
                type="button"
                onClick={() => syncMutation.mutate(selectedProvider)}
                disabled={!props.scope || isBusy}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/15 disabled:opacity-60"
              >
                {syncMutation.isPending ? "Syncing..." : "Sync now"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-4 py-2 text-xs text-zinc-300 hover:bg-white/10"
              >
                Continue onboarding
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
