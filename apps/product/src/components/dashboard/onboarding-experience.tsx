"use client";

import { useEffect, useMemo, useState } from "react";
import { OnboardingWorkflow } from "@/components/dashboard/onboarding-workflow";

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const ACTIVATION_STEPS = [
  "Connecting to bank",
  "Mapping transactions",
  "Detecting GST patterns",
  "Calculating ITC",
  "Running compliance checks"
] as const;

const LIVE_SCAN_TARGETS = {
  transactionsDetected: 842,
  autoCategorizedPct: 91,
  gstEstimatedInr: 112450,
  potentialItcInr: 32000
} as const;

type IntroPhase = "intro" | "activation" | "live-scan" | "reveal" | "workflow";

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function OnboardingExperience() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = useState<IntroPhase>("intro");
  const [showFirstLine, setShowFirstLine] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [limitedAccuracyMode, setLimitedAccuracyMode] = useState(false);

  const [activationProgress, setActivationProgress] = useState(0);
  const [activationStepIndex, setActivationStepIndex] = useState(0);

  const [liveScanProgress, setLiveScanProgress] = useState(0);
  const [transactionsDetected, setTransactionsDetected] = useState(0);
  const [autoCategorizedPct, setAutoCategorizedPct] = useState(0);
  const [gstEstimatedInr, setGstEstimatedInr] = useState(0);
  const [potentialItcInr, setPotentialItcInr] = useState(0);

  useEffect(() => {
    if (phase !== "intro") {
      return;
    }

    if (prefersReducedMotion) {
      setShowFirstLine(false);
      setShowSecondLine(true);
      setShowLogo(true);
      setShowForm(true);
      return;
    }

    const timers = [
      window.setTimeout(() => setShowFirstLine(true), 120),
      // 0.8s-style pause before morphing
      window.setTimeout(() => setShowSecondLine(true), 1720),
      window.setTimeout(() => setShowLogo(true), 2460),
      window.setTimeout(() => setShowForm(true), 2900)
    ];

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "activation") {
      return;
    }

    if (prefersReducedMotion) {
      setActivationProgress(100);
      setActivationStepIndex(ACTIVATION_STEPS.length - 1);
      const doneTimer = window.setTimeout(() => setPhase("live-scan"), 250);
      return () => window.clearTimeout(doneTimer);
    }

    const durationMs = 3200;
    const startedAt = performance.now();
    let rafId = 0;

    const tick = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = Math.max(0, Math.min(1, elapsed / durationMs));
      setActivationProgress(Math.round(progress * 100));

      const nextStep = Math.min(
        ACTIVATION_STEPS.length - 1,
        Math.floor(progress * ACTIVATION_STEPS.length)
      );
      setActivationStepIndex(nextStep);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      setPhase("live-scan");
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    if (phase !== "live-scan") {
      return;
    }

    if (prefersReducedMotion) {
      setLiveScanProgress(100);
      setTransactionsDetected(LIVE_SCAN_TARGETS.transactionsDetected);
      setAutoCategorizedPct(LIVE_SCAN_TARGETS.autoCategorizedPct);
      setGstEstimatedInr(LIVE_SCAN_TARGETS.gstEstimatedInr);
      setPotentialItcInr(LIVE_SCAN_TARGETS.potentialItcInr);
      const doneTimer = window.setTimeout(() => setPhase("reveal"), 300);
      return () => window.clearTimeout(doneTimer);
    }

    const durationMs = 3000;
    const startedAt = performance.now();
    let rafId = 0;
    let finished = false;

    const tick = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = Math.max(0, Math.min(1, elapsed / durationMs));
      const eased = 1 - Math.pow(1 - progress, 3);

      setLiveScanProgress(Math.round(progress * 100));
      setTransactionsDetected(Math.round(LIVE_SCAN_TARGETS.transactionsDetected * eased));
      setAutoCategorizedPct(Math.round(LIVE_SCAN_TARGETS.autoCategorizedPct * eased));
      setGstEstimatedInr(Math.round(LIVE_SCAN_TARGETS.gstEstimatedInr * eased));
      setPotentialItcInr(Math.round(LIVE_SCAN_TARGETS.potentialItcInr * eased));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (!finished) {
        finished = true;
        window.setTimeout(() => setPhase("reveal"), 450);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [phase, prefersReducedMotion]);

  const firstTextClass = useMemo(
    () =>
      showFirstLine && !showSecondLine
        ? "opacity-100 translate-y-0 blur-0"
        : "opacity-0 -translate-y-3 blur-[1px]",
    [showFirstLine, showSecondLine]
  );

  const secondTextClass = useMemo(
    () =>
      showSecondLine
        ? "opacity-100 translate-y-0 blur-0"
        : "opacity-0 translate-y-3 blur-[1px]",
    [showSecondLine]
  );

  function beginOnboardingFlow() {
    const normalizedBusinessName = businessName.trim();
    if (normalizedBusinessName.length < 2) {
      setFormError("Enter business name to continue.");
      return;
    }

    const normalizedGstin = gstin.trim().toUpperCase();
    if (normalizedGstin.length > 0 && !GSTIN_REGEX.test(normalizedGstin)) {
      setFormError("Enter a valid GSTIN.");
      return;
    }

    setFormError(null);
    setBusinessName(normalizedBusinessName);
    setGstin(normalizedGstin);
    setLimitedAccuracyMode(normalizedGstin.length === 0);

    setActivationProgress(0);
    setActivationStepIndex(0);
    setLiveScanProgress(0);
    setTransactionsDetected(0);
    setAutoCategorizedPct(0);
    setGstEstimatedInr(0);
    setPotentialItcInr(0);

    setPhase("activation");
  }

  if (phase === "workflow") {
    return (
      <section className="mx-auto w-full max-w-[1180px] px-3 py-4 md:px-5 md:py-6">
        <OnboardingWorkflow
          initialBusinessName={businessName}
          initialWorkspaceName={businessName}
        />
      </section>
    );
  }

  if (phase === "activation") {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.09),transparent_55%)]" />
        </div>

        <div className="relative z-10 w-full max-w-[760px] rounded-[28px] border border-white/10 bg-zinc-950/65 px-6 py-7 text-zinc-100 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm md:px-8 md:py-9">
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Activation Mode
          </p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">
            Activating your financial system.
          </h2>

          <ul className="mx-auto mt-7 w-full max-w-[560px] space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm md:text-base">
            {ACTIVATION_STEPS.map((step, index) => {
              const isActive = index === activationStepIndex;
              const isDone = index < activationStepIndex;
              return (
                <li
                  key={step}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? "text-zinc-100"
                      : isDone
                        ? "text-zinc-400"
                        : "text-zinc-500"
                  }`}
                >
                  • {step}
                </li>
              );
            })}
          </ul>

          <div className="mt-7">
            <div className="h-2 w-full overflow-hidden rounded-full border border-white/12 bg-white/8">
              <div
                className="h-full rounded-full bg-zinc-100 transition-[width] duration-200 ease-out"
                style={{ width: `${activationProgress}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs text-zinc-400">{activationProgress}%</p>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "live-scan") {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.08),transparent_58%)]" />
        </div>

        <div className="relative z-10 w-full max-w-[760px] rounded-[28px] border border-white/10 bg-zinc-950/65 px-6 py-7 text-zinc-100 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm md:px-8 md:py-9">
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Live Scan
          </p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight text-zinc-100 md:text-5xl">
            Financial intelligence is loading in real time.
          </h2>

          {limitedAccuracyMode ? (
            <p className="mt-3 text-center text-xs text-zinc-300">
              You&apos;ll get limited accuracy without integrations.
            </p>
          ) : null}

          <ul className="mx-auto mt-7 w-full max-w-[560px] space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm md:text-base">
            <li>• {transactionsDetected.toLocaleString("en-IN")} transactions detected</li>
            <li>• {autoCategorizedPct}% auto-categorized</li>
            <li>• {formatInr(gstEstimatedInr)} estimated GST</li>
            <li>• {formatInr(potentialItcInr)} potential ITC</li>
          </ul>

          <div className="mt-7">
            <div className="h-2 w-full overflow-hidden rounded-full border border-white/12 bg-white/8">
              <div
                className="h-full rounded-full bg-zinc-100 transition-[width] duration-200 ease-out"
                style={{ width: `${liveScanProgress}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs text-zinc-400">{liveScanProgress}%</p>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "reveal") {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-100 px-6 py-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_4%,rgba(0,0,0,0.08),transparent_48%)]" />
        </div>

        <div
          className="relative z-10 w-full max-w-[760px] rounded-[28px] border border-zinc-200 bg-white px-6 py-7 text-zinc-900 shadow-[0_28px_90px_rgba(0,0,0,0.12)] md:px-8 md:py-9"
          data-reveal="true"
        >
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Reveal
          </p>
          <h2 className="mt-2 text-center text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl">
            You&apos;re 92% compliant.
          </h2>

          <div className="mx-auto mt-7 w-full max-w-[560px] space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700 md:text-base">
            <p>Next GST due in 5 days</p>
            <p>Safe cash after payment: ₹8,43,200</p>
          </div>

          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => setPhase("workflow")}
              className="w-full max-w-[320px] rounded-full border border-zinc-900 bg-zinc-900 px-6 py-3 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              Enter Control Center →
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.06),transparent_52%)]" />
      </div>

      <div className="relative z-10 flex w-full max-w-[860px] flex-col items-center text-center">
        <div className="relative h-[84px] w-full">
          <h1
            className={`absolute inset-0 text-balance text-3xl font-medium tracking-tight text-zinc-100 transition-all duration-700 ease-out md:text-5xl ${firstTextClass}`}
          >
            Accounting for the modern business
          </h1>
          <h1
            className={`absolute inset-0 text-balance text-3xl font-semibold tracking-tight text-zinc-100 transition-all duration-700 ease-out md:text-5xl ${secondTextClass}`}
          >
            Built for how you work today
          </h1>
        </div>

        <p
          className={`mt-6 text-[2.5rem] leading-none tracking-tight text-zinc-200 transition-all duration-700 ease-out md:text-[3rem] ${
            showLogo ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          trai<span className="font-light">{"\\"}</span>
        </p>

        <div
          className={`mt-8 w-full max-w-[420px] rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-4 text-left transition-all duration-500 ${
            showForm ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
          }`}
        >
          <label className="block text-xs font-medium text-zinc-300" htmlFor="business-name">
            Business name
          </label>
          <input
            id="business-name"
            type="text"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Acme Private Limited"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
            autoComplete="organization"
          />

          <label className="mt-3 block text-xs font-medium text-zinc-300" htmlFor="gstin">
            GSTIN
          </label>
          <input
            id="gstin"
            type="text"
            value={gstin}
            onChange={(event) => setGstin(event.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-sm uppercase tracking-wide text-zinc-100 placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-500"
            maxLength={15}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <p className="mt-2 text-xs text-zinc-400">
            GSTIN is optional. You&apos;ll get limited accuracy without integrations.
          </p>

          {formError ? <p className="mt-2 text-xs text-orange-300">{formError}</p> : null}

          <button
            type="button"
            onClick={beginOnboardingFlow}
            className="mt-4 w-full rounded-full border border-orange-500/80 bg-orange-500 px-7 py-3 text-sm font-semibold tracking-wide text-black shadow-[0_12px_36px_rgba(255,106,0,0.35)] transition-all duration-300 hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80"
          >
            Take control →
          </button>
        </div>
      </div>
    </section>
  );
}

