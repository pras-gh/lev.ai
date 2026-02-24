"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Bot, Loader2, Search } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Reconciliation", href: "/reconciliation" },
  { label: "Alerts", href: "/alerts" },
  { label: "Integrations", href: "/integrations" }
] as const;

type ScopeRouteState = {
  workspaceId: string | null;
  businessId: number | null;
};

type GateState = ScopeRouteState & {
  ready: boolean;
  loading: boolean;
  completed: boolean;
  error: string | null;
};

type OnboardingStatusResponse = {
  hasWorkspace?: boolean;
  workspace?: {
    id?: unknown;
    businessId?: unknown;
  } | null;
  onboarding?: {
    completed?: unknown;
  } | null;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

function buildScopedHref(path: string, scope: ScopeRouteState): string {
  const params = new URLSearchParams();
  if (scope.workspaceId) {
    params.set("workspaceId", scope.workspaceId);
  }
  if (scope.businessId && Number.isFinite(scope.businessId)) {
    params.set("businessId", String(scope.businessId));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function TrailLogo() {
  return (
    <div>
      <p className="text-[2.6rem] font-semibold leading-none tracking-tight text-zinc-100">
        trai<span className="font-light">{"\\"}</span>
      </p>
      <p className="mt-3 text-sm font-medium text-zinc-100">Books that never fall behind</p>
      <p className="mt-1 max-w-[190px] text-xs leading-relaxed text-zinc-400">
        Live ledger health, GST readiness, and cash runway - updated continuously.
      </p>
    </div>
  );
}

function LeftRail({
  pathname,
  scope
}: {
  pathname: string;
  scope: ScopeRouteState;
}) {
  return (
    <aside className="ui-panel-dark hidden w-[250px] shrink-0 flex-col p-5 shadow-[0_28px_80px_rgba(0,0,0,0.52)] lg:flex">
      <TrailLogo />

      <article className="mt-6 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
        <p className="ui-label">User</p>
        <p className="mt-2 text-base font-medium text-zinc-100">Prasoon Pathak</p>
        <p className="mt-1 text-xs text-zinc-400">ID: TRL-IND-0001</p>
      </article>

      <nav className="mt-6 space-y-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const href = buildScopedHref(item.href, scope);
          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-xl border px-3 py-2 text-sm font-medium transition ${
                active
                  ? "border-white/26 bg-white/14 text-zinc-100"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/16 hover:bg-white/[0.07]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/20 bg-white/8 px-3 py-2 text-xs font-medium text-zinc-200">
        Live finance signals active
      </div>
    </aside>
  );
}

export function DashboardShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectInFlight = useRef<string | null>(null);
  const isOnboardingRoute = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const workspaceIdFromQuery = searchParams.get("workspaceId");
  const businessIdFromQuery = searchParams.get("businessId");

  const queryBusinessId = useMemo(() => {
    const parsed = Number.parseInt(businessIdFromQuery ?? "", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [businessIdFromQuery]);

  const [gateState, setGateState] = useState<GateState>({
    ready: false,
    loading: true,
    completed: false,
    workspaceId: workspaceIdFromQuery,
    businessId: queryBusinessId,
    error: null
  });

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function loadGate() {
      setGateState((current) => ({
        ...current,
        loading: true,
        error: null
      }));

      const params = new URLSearchParams();
      if (workspaceIdFromQuery) {
        params.set("workspaceId", workspaceIdFromQuery);
      }

      const query = params.toString();
      const endpoint = query ? `/api/onboarding/status?${query}` : "/api/onboarding/status";

      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: abortController.signal
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            if (!cancelled) {
              setGateState({
                ready: true,
                loading: false,
                completed: true,
                workspaceId: workspaceIdFromQuery,
                businessId: queryBusinessId,
                error: null
              });
            }
            return;
          }

          const payload = await response.json().catch(() => null);
          if (!cancelled) {
            setGateState({
              ready: true,
              loading: false,
              completed: false,
              workspaceId: workspaceIdFromQuery,
              businessId: queryBusinessId,
              error: parseErrorMessage(payload, "Failed to resolve onboarding status")
            });
          }
          return;
        }

        const payload = (await response.json()) as OnboardingStatusResponse;
        const completed = Boolean(payload.onboarding?.completed);
        const workspaceId =
          typeof payload.workspace?.id === "string"
            ? payload.workspace.id
            : workspaceIdFromQuery;
        const businessId =
          typeof payload.workspace?.businessId === "number" &&
          Number.isInteger(payload.workspace.businessId)
            ? payload.workspace.businessId
            : queryBusinessId;

        if (!cancelled) {
          setGateState({
            ready: true,
            loading: false,
            completed,
            workspaceId,
            businessId,
            error: null
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setGateState({
          ready: true,
          loading: false,
          completed: false,
          workspaceId: workspaceIdFromQuery,
          businessId: queryBusinessId,
          error: "Unable to verify onboarding status"
        });
      }
    }

    void loadGate();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [queryBusinessId, workspaceIdFromQuery]);

  const scopedRoute = useMemo<ScopeRouteState>(
    () => ({
      workspaceId: gateState.workspaceId ?? workspaceIdFromQuery,
      businessId: gateState.businessId ?? queryBusinessId
    }),
    [gateState.businessId, gateState.workspaceId, queryBusinessId, workspaceIdFromQuery]
  );

  const currentPathWithQuery = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    redirectInFlight.current = null;
  }, [currentPathWithQuery]);

  useEffect(() => {
    if (!gateState.ready || gateState.loading || gateState.error) {
      return;
    }

    const target =
      !isOnboardingRoute && !gateState.completed
        ? buildScopedHref("/onboarding", scopedRoute)
        : isOnboardingRoute && gateState.completed
          ? buildScopedHref("/dashboard", scopedRoute)
          : null;

    if (!target || target === currentPathWithQuery) {
      return;
    }

    if (redirectInFlight.current === target) {
      return;
    }

    redirectInFlight.current = target;
    router.replace(target);
  }, [
    currentPathWithQuery,
    gateState.completed,
    gateState.error,
    gateState.loading,
    gateState.ready,
    isOnboardingRoute,
    router,
    scopedRoute
  ]);

  const shouldBlockForGate =
    gateState.loading ||
    (!isOnboardingRoute && gateState.ready && !gateState.completed && !gateState.error) ||
    (isOnboardingRoute && gateState.ready && gateState.completed && !gateState.error);

  if (shouldBlockForGate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-200">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your workspace...
        </div>
      </div>
    );
  }

  if (isOnboardingRoute) {
    return <div className="min-h-screen bg-black text-zinc-100">{children}</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-4 md:px-5 md:py-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-zinc-400/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[54vh] bg-gradient-to-t from-zinc-500/28 to-transparent" />
        <div className="absolute -right-16 top-44 h-64 w-64 rounded-full bg-zinc-300/16 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1600px] gap-3 md:gap-4">
        <LeftRail pathname={pathname} scope={scopedRoute} />

        <section className="ui-panel-dark relative min-w-0 flex-1 p-4 shadow-[0_34px_96px_rgba(0,0,0,0.6)] md:p-5">
          <header className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/12 bg-black/55 px-4 py-4 md:px-5">
            <div className="lg:hidden">
              <TrailLogo />
            </div>

            <div className="hidden min-w-0 flex-1 text-sm text-zinc-400 md:block">
              Trail works. You supervise.
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="ui-button-solid inline-flex items-center gap-2 px-3 py-2"
                aria-label="Open Trail Hire"
              >
                <Bot className="h-4 w-4" />
                Trail Hire
              </button>
              <button
                type="button"
                className="ui-button rounded-lg p-2 text-zinc-300"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="ui-button rounded-lg p-2 text-zinc-300"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="mt-3" data-reveal="true">
            {children}
          </main>
        </section>
      </div>
    </div>
  );
}
