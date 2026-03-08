"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { LoginModal } from "@/components/auth/login-modal";
import { BrandMark } from "@/components/brand-mark";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

type AskTrailExample = {
  question: string;
  answer: string;
};

type Callout = {
  title: string;
  description: string;
  glyph: "ledger" | "shield" | "cash" | "statement";
};

type FlowItem =
  | {
      id: string;
      kind: "logo";
      src: string;
      alt: string;
    }
  | {
      id: string;
      kind: "tag";
      label: string;
    };

const easing = [0.22, 1, 0.36, 1] as const;

const navLinks: Array<{ href: string; label: string }> = [];

const askTrailExamples: AskTrailExample[] = [
  {
    question: "Can we hire?",
    answer: "Yes, if hiring stays within Rs 1.5L this month after expected GST and payroll outflows.",
  },
  {
    question: "Why did expenses increase?",
    answer: "Two vendor payments settled this week and cloud infra spend moved up 12% month-on-month.",
  },
  {
    question: "How much GST do we owe?",
    answer: "Current projected GST payable is Rs 38,200 for this cycle after input credit adjustments.",
  },
];

const callouts: Callout[] = [
  {
    title: "Books updated automatically",
    description: "trai\\ cleans entries and keeps books audit-ready all month.",
    glyph: "ledger",
  },
  {
    title: "Early tax risk alerts",
    description: "trai\\ catches filing risk and ITC mismatches before deadline pain.",
    glyph: "shield",
  },
  {
    title: "Clear cash visibility",
    description: "trai\\ turns inflows, outflows, and runway into practical decisions.",
    glyph: "cash",
  },
  {
    title: "Close-ready financials",
    description: "trai\\ delivers founder-ready statements without month-end scramble.",
    glyph: "statement",
  },
];

const integrationFlowItems: FlowItem[] = [
  { id: "upload-mark", kind: "logo", src: "/integrations/uploaded-mark.svg", alt: "Uploaded integration icon" },
  { id: "slack", kind: "logo", src: "/integrations/slack-logo.svg", alt: "Slack icon" },
  { id: "shopify", kind: "logo", src: "/integrations/shopify-logo.svg", alt: "Shopify icon" },
  { id: "telegram", kind: "logo", src: "/integrations/telegram-logo.svg", alt: "Telegram icon" },
  { id: "whatsapp", kind: "logo", src: "/integrations/whatsapp-logo.svg", alt: "WhatsApp icon" },
  { id: "stripe", kind: "logo", src: "/integrations/stripe-icon.svg", alt: "Stripe icon" },
  { id: "hdfc", kind: "logo", src: "/integrations/hdfc-icon.svg", alt: "HDFC Bank icon" },
  { id: "cognism", kind: "logo", src: "/integrations/cognism-icon.svg", alt: "Cognism icon" },
  { id: "tally", kind: "logo", src: "/integrations/tally-icon.svg", alt: "Tally icon" },
  { id: "and-more", kind: "tag", label: "and more" },
];

const integrationFlowLanes = [
  "8%",
  "16%",
  "24%",
  "32%",
  "40%",
  "48%",
  "56%",
  "64%",
  "72%",
  "80%",
];

const resourceLinks = [
  { label: "Pricing", href: normalizeBookingUrl(siteConfig.calcom30MinUrl) },
  { label: "Help Center", href: "mailto:help@gettrail.ai" },
];

const INTRO_WORD = "Introducing";
type IntroPhase = "typing" | "flip" | "get";
type HeroOutputMetric = {
  label: string;
  value: string;
};

const heroDemoInputs = [
  "UPI Rs 12,400 received",
  "Razorpay payout Rs 41,200",
  "Vendor payment Rs 7,200",
  "GST liability detected",
] as const;

const heroDemoOutputs: HeroOutputMetric[] = [
  { label: "Cash balance", value: "Rs 5.4L" },
  { label: "Runway", value: "6.2 months" },
  { label: "GST due", value: "Rs 38,200" },
];

const productVisualCards = [
  {
    label: "Dashboard",
    title: "Live finance control room",
    lines: ["Cash balance: Rs 5.4L", "Runway: 6.2 months", "Month close: On track"],
  },
  {
    label: "AI answers",
    title: "Operator-grade responses",
    lines: [
      "Q: Can we hire this month?",
      "A: Yes, within a Rs 1.5L safe limit.",
      "GST due remains covered.",
    ],
  },
  {
    label: "Transaction analysis",
    title: "Continuous movement analysis",
    lines: ["Vendor payout concentration: 41%", "Collections slowed by 8%", "Refund impact this week: Rs 32k"],
  },
  {
    label: "GST alerts",
    title: "Risk before deadline",
    lines: ["GST due in 5 days", "Projected payable: Rs 38,200", "One ITC mismatch flagged"],
  },
] as const;

const quickUnderstandingPoints = [
  "Trail reads transactions continuously",
  "Trail calculates cash + GST automatically",
  "Trail gives plain-English next actions",
] as const;

function metricTone(label: string) {
  if (label.toLowerCase().includes("gst")) {
    return {
      card: "border-rose-200 bg-rose-50",
      label: "text-rose-600",
      value: "text-rose-700",
    };
  }

  if (label.toLowerCase().includes("runway")) {
    return {
      card: "border-blue-200 bg-blue-50",
      label: "text-blue-600",
      value: "text-blue-700",
    };
  }

  return {
    card: "border-emerald-200 bg-emerald-50",
    label: "text-emerald-700",
    value: "text-emerald-800",
  };
}

function heroItem(shouldReduceMotion: boolean, delay: number) {
  return {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 30,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.6,
        delay: shouldReduceMotion ? 0 : delay,
        ease: easing,
      },
    },
  };
}

function revealInView(shouldReduceMotion: boolean, delay = 0) {
  return {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.56,
        delay: shouldReduceMotion ? 0 : delay,
        ease: easing,
      },
    },
  };
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 text-blue-300">
      <path d="m10 2.6 2 4 4.4.7-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.7 2-4Z" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SocialIcon({ kind }: { kind: "x" | "linkedin" }) {
  if (kind === "x") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <path d="M5 5h3.5l3.1 4.7L15.8 5H19l-5.7 6.3L19.5 19H16l-3.5-5.2L7.9 19H4.6l6.1-6.9L5 5Z" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <path d="M7.2 8.2a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6ZM6 9.3h2.4v8.1H6V9.3Zm3.8 0h2.3v1.1h.1c.3-.6 1.1-1.2 2.3-1.2 2.4 0 2.9 1.6 2.9 3.7v4.5h-2.4v-4c0-.9 0-2.2-1.3-2.2s-1.5 1-1.5 2.1v4.1H9.8V9.3Z" fill="currentColor" />
      </svg>
    );
  }

}

function CalloutGlyph({ glyph }: { glyph: Callout["glyph"] }) {
  if (glyph === "ledger") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="M6 4h9l3 3v13H6V4Zm8 0v3h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (glyph === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="m12 3 7 3.2v5.1c0 4.3-2.8 7.3-7 9.7-4.2-2.4-7-5.4-7-9.7V6.2L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9.7 11.9 1.6 1.6 3.3-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (glyph === "cash") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <rect x="3.5" y="6" width="17" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9.5h.01M16 14.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path d="M6 4h12v16H6z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HeroInputAiClarity({ shouldReduceMotion }: { shouldReduceMotion: boolean }) {
  const [phase, setPhase] = useState(0);
  const inputVisibleCount = shouldReduceMotion ? heroDemoInputs.length : Math.min(heroDemoInputs.length, phase + 1);
  const aiActive = shouldReduceMotion ? true : phase >= 2;
  const clarityVisible = shouldReduceMotion ? true : phase >= 4;

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setPhase((prev) => (prev + 1) % 7);
    }, 950);

    return () => {
      window.clearInterval(interval);
    };
  }, [shouldReduceMotion]);

  return (
    <div className="mx-auto w-full max-w-[980px] rounded-[24px] border border-slate-200/70 bg-[#f7f9fc] p-4 backdrop-blur-xl sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Input to clarity
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Input</p>
          <div className="mt-2 space-y-1.5">
            {heroDemoInputs.map((entry, index) => (
              <motion.p
                key={entry}
                initial={false}
                animate={{ opacity: index < inputVisibleCount ? 1 : 0.25, y: index < inputVisibleCount ? 0 : 4 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: easing }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
              >
                {entry}
              </motion.p>
            ))}
          </div>
        </div>

        <div className="hidden items-center justify-center text-xl text-blue-500/80 md:flex">→</div>

        <motion.div
          initial={false}
          animate={{
            opacity: aiActive ? 1 : 0.55,
            boxShadow: aiActive
              ? "0 12px 28px -20px rgba(76,141,255,0.35)"
              : "0 0 0 0 rgba(0,0,0,0)",
          }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: easing }}
          className="rounded-xl border border-blue-200 bg-blue-50 p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-600">AI</p>
          <div className="mt-2 flex items-center gap-2">
            <motion.span
              animate={shouldReduceMotion ? undefined : { opacity: [0.35, 1, 0.35], scale: [1, 1.15, 1] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="inline-flex h-2 w-2 rounded-full bg-blue-500"
            />
            <p className="text-sm font-medium text-slate-800">trai\\ is analyzing</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Classifies entries, reconciles movement, and computes GST and runway in real time.
          </p>
        </motion.div>

        <div className="hidden items-center justify-center text-xl text-blue-500/80 md:flex">→</div>

        <motion.div
          initial={false}
          animate={{ opacity: clarityVisible ? 1 : 0.35, y: clarityVisible ? 0 : 6 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: easing }}
          className="rounded-xl border border-slate-200 bg-white p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Clarity</p>
          <div className="mt-2 space-y-1.5">
            {heroDemoOutputs.map((metric) => (
              <div
                key={metric.label}
                className={`rounded-lg border px-2.5 py-1.5 ${metricTone(metric.label).card}`}
              >
                <p className={`text-[11px] ${metricTone(metric.label).label}`}>{metric.label}</p>
                <p className={`text-sm font-semibold ${metricTone(metric.label).value}`}>{metric.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function WorkspaceUiDemo({ shouldReduceMotion }: { shouldReduceMotion: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: easing }}
      className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#161a22] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.45)]"
    >
      <div className="grid min-h-[420px] lg:grid-cols-[220px_1fr]">
        <aside className="border-b border-white/10 bg-[#141923] p-5 lg:border-b-0 lg:border-r">
          <p className="text-2xl font-semibold tracking-tight text-white">
            trai<span className="font-light">{"\\"}</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-400">Workspace</p>
          <div className="mt-6 space-y-2 text-sm">
            {["Dashboard", "Reconciliation", "Alerts", "Integrations"].map((item, index) => (
              <div
                key={item}
                className={`rounded-lg border px-3 py-2 ${
                  index === 0
                    ? "border-white/30 bg-white/12 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="bg-[#161a22] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white">Acme Workspace</p>
              <p className="text-xs text-slate-400">Live finance console</p>
            </div>
            <span className="rounded-full border border-blue-300/30 bg-blue-300/10 px-3 py-1 text-xs font-medium text-blue-200">
              Sync active
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
              <p className="text-xs text-emerald-700">Cash balance</p>
              <p className="mt-1 text-xl font-semibold text-emerald-800">Rs 5,48,000</p>
              <p className="text-xs text-emerald-700">↑ 8% this month</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
              <p className="text-xs text-blue-700">Runway</p>
              <p className="mt-1 text-xl font-semibold text-blue-800">6.2 months</p>
              <p className="text-xs text-blue-700">Insight updated 2m ago</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
              <p className="text-xs text-rose-700">GST due</p>
              <p className="mt-1 text-xl font-semibold text-rose-800">Rs 38,200</p>
              <p className="text-xs text-rose-700">Due in 5 days</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Recent transactions</p>
            <div className="mt-2 space-y-2 text-sm">
              {[
                ["Razorpay payout", "Rs 41,200", "insight"],
                ["Vendor payment", "Rs 7,200", "alert"],
                ["UPI collection", "Rs 12,400", "positive"],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2">
                  <p className="text-slate-200">{label}</p>
                  <p
                    className={
                      tone === "positive"
                        ? "font-medium text-emerald-300"
                        : tone === "alert"
                          ? "font-medium text-rose-300"
                          : "font-medium text-blue-300"
                    }
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const calBookingUrl = normalizeBookingUrl(siteConfig.calcom30MinUrl);
  const productDemoUrl = normalizeBookingUrl(siteConfig.productAppUrl);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(shouldReduceMotion ? "get" : "typing");
  const [introCount, setIntroCount] = useState(shouldReduceMotion ? INTRO_WORD.length : 0);
  const displayIntroPhase = shouldReduceMotion ? "get" : introPhase;
  const displayIntroCount = shouldReduceMotion ? INTRO_WORD.length : introCount;

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const timeouts: number[] = [];
    timeouts.push(
      window.setTimeout(() => {
        setIntroPhase("typing");
        setIntroCount(0);
      }, 0)
    );
    let localCount = 0;
    const typeInterval = window.setInterval(() => {
      localCount += 1;
      setIntroCount(localCount);

      if (localCount >= INTRO_WORD.length) {
        window.clearInterval(typeInterval);
        timeouts.push(
          window.setTimeout(() => {
            setIntroPhase("flip");
          }, 520)
        );
        timeouts.push(
          window.setTimeout(() => {
            setIntroPhase("get");
          }, 1220)
        );
      }
    }, 150);

    return () => {
      window.clearInterval(typeInterval);
      timeouts.forEach((timer) => window.clearTimeout(timer));
    };
  }, [shouldReduceMotion]);

  return (
    <div className="relative min-h-screen overflow-x-clip pb-20 text-slate-100">
      <div className="lev-page-backdrop pointer-events-none absolute inset-0" />

      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-white/10 bg-[#0f1115]/88 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            : "border-b border-transparent bg-[#0f1115]/66 backdrop-blur-lg"
        }`}
      >
        <div className="flex w-full items-center justify-between px-6 py-4 sm:px-8">
          <Link href="/" aria-label="trai\\ home">
            <BrandMark className="text-[1.1rem] font-semibold" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-slate-300 transition hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a href={calBookingUrl} className="lev-button lev-button--dark">
              Book Demo
              <ArrowIcon />
            </a>
            <LoginModal triggerClassName="hidden md:inline-flex" />
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-100 md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: easing }}
              className="border-t border-white/10 bg-[#0f1115]/96 px-6 py-4 md:hidden"
            >
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                  >
                    {link.label}
                  </a>
                ))}
                <a href={calBookingUrl} onClick={() => setMobileOpen(false)} className="lev-button lev-button--emerald w-fit">
                  Book Demo
                  <ArrowIcon />
                </a>
                <LoginModal
                  onTriggerClick={() => {
                    setMobileOpen(false);
                  }}
                  triggerClassName="lev-button lev-button--outline w-fit"
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative w-full px-6 pt-26 sm:px-8 sm:pt-28">
        <section className="lev-hero-deep relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex min-h-[calc(100vh-8rem)] w-screen items-center justify-center px-6 py-14 sm:px-8 sm:py-18">
          <div className="relative z-10 w-full text-center">
            <motion.div initial="hidden" animate="visible" variants={heroItem(shouldReduceMotion, 0)}>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                <StarIcon />
                In-house finance hire
              </p>
            </motion.div>

            <div className="mt-8 flex min-h-[78px] items-center justify-center sm:min-h-[96px]">
              <AnimatePresence mode="wait">
                {displayIntroPhase === "get" ? (
                  <motion.p
                    key="intro-get"
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14, scale: shouldReduceMotion ? 1 : 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -12 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.56, ease: easing }}
                    className="lev-torch-text text-[clamp(2.4rem,7.6vw,5.4rem)] leading-[0.9] font-semibold tracking-[-0.04em]"
                  >
                    trai\
                  </motion.p>
                ) : (
                  <motion.p
                    key="intro-writing"
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14, rotateX: shouldReduceMotion ? 0 : 24 }}
                    animate={
                      displayIntroPhase === "flip"
                        ? { opacity: 0, y: shouldReduceMotion ? 0 : -12, rotateX: shouldReduceMotion ? 0 : 90 }
                        : { opacity: 1, y: 0, rotateX: 0 }
                    }
                    exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.52, ease: easing }}
                    className="lev-torch-text text-[clamp(2.4rem,7.6vw,5.4rem)] leading-[0.9] font-semibold tracking-[-0.04em] [transform-style:preserve-3d]"
                  >
                    {INTRO_WORD.slice(0, displayIntroCount)}
                    {displayIntroPhase === "typing" ? (
                      <motion.span
                        aria-hidden="true"
                        animate={shouldReduceMotion ? undefined : { opacity: [1, 0.25, 1] }}
                        transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        className="ml-1 inline-block h-[0.92em] w-[2px] translate-y-[0.06em] bg-emerald-300"
                      />
                    ) : null}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.15)}
              className="mx-auto mt-4 max-w-[980px] text-[clamp(2.3rem,6.4vw,4.8rem)] leading-[0.95] font-semibold tracking-[-0.035em] text-white"
            >
              Your AI Accountant
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.3)}
              className="mx-auto mt-6 max-w-3xl text-[1.08rem] leading-relaxed text-slate-300 sm:text-[1.16rem]"
            >
              Trail acts like your in-house accountant by converting daily transactions into clean books,
              GST readiness, and clear cash decisions.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.45)}
              className="mt-10 flex justify-center"
            >
              <a href={calBookingUrl} className="lev-button lev-button--hero-dark lev-cta-pulse">
                get trai\
                <ArrowIcon />
              </a>
            </motion.div>

          </div>
        </section>

        <motion.section
          id="product-demo"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-section lev-section--light mt-12"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">trai\</h2>
            </div>
            <a href={productDemoUrl} className="lev-button lev-button--dark">
              Open App Demo
              <ArrowIcon />
            </a>
          </div>
          <WorkspaceUiDemo shouldReduceMotion={shouldReduceMotion} />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {productVisualCards.map((card, index) => (
              <motion.div
                key={card.label}
                whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: "0 24px 52px -34px rgba(0,234,100,0.45)" }}
                transition={{ duration: 0.2, ease: easing }}
                className="glass-panel rounded-[22px] border border-white/12 p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                  {card.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{card.title}</p>
                <div className="mt-3 space-y-2">
                  {card.lines.map((line) => (
                    <p
                      key={`${card.label}-${line}`}
                      className={`rounded-lg border px-2.5 py-1.5 text-sm leading-relaxed ${
                        index % 2 === 0
                          ? "border-white/12 bg-white/[0.05] text-slate-200"
                          : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                      }`}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="core-benefit"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-section lev-section--dark mt-8"
        >
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">One core benefit</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Trail keeps your books accurate and decision-ready every day
            </h2>
          </div>
          <div className="glass-panel rounded-[24px] border border-emerald-300/25 bg-emerald-300/[0.1] p-5 sm:p-6">
            <p className="text-lg font-semibold text-white">
              Instead of month-end cleanup, Trail behaves like a continuous accountant:
              reconciles entries, flags GST risk early, and explains cash movement in plain English.
            </p>
          </div>
        </motion.section>

        <motion.section
          id="clear-examples"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-section lev-section--light mt-16"
        >
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Clear examples</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Ask Trail practical finance questions and get immediate answers
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {askTrailExamples.map((example, index) => (
              <motion.div
                key={example.question}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.6 }}
                variants={revealInView(shouldReduceMotion, index * 0.08)}
                className="glass-panel rounded-[22px] border border-white/12 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Question</p>
                <p className="mt-2 text-lg font-semibold text-white">{example.question}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">Trail</p>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100">{example.answer}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="fast-understanding"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-section lev-section--dark mt-16"
        >
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Fast understanding</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Understand Trail in under 10 seconds
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <HeroInputAiClarity shouldReduceMotion={shouldReduceMotion} />
            <div className="glass-panel rounded-[24px] border border-white/12 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">How Trail works</p>
              <div className="mt-4 space-y-2">
                {quickUnderstandingPoints.map((point, index) => (
                  <motion.div
                    key={point}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.6 }}
                    variants={revealInView(shouldReduceMotion, index * 0.08)}
                    className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100"
                  >
                    {point}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-section lev-section--light mt-16"
        >
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Features</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Built-in finance control for daily operations
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              How Trail acts like an accountant: it reconciles books, catches GST risk, and provides cash visibility.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {callouts.map((item, index) => (
              <motion.div
                key={item.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.6 }}
                variants={revealInView(shouldReduceMotion, index * 0.08)}
                className="glass-panel rounded-[22px] border border-white/12 p-5"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/12 text-emerald-200">
                  <CalloutGlyph glyph={item.glyph} />
                </span>
                <p className="mt-3 text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="integrations"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-section lev-section--dark mt-16"
        >
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Integrations</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Everything flows through trai\
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              How Trail acts like an accountant: it consolidates tools into one continuous finance workflow.
            </p>
          </div>

          <div className="glass-panel rounded-[26px] border border-white/12 p-5 sm:p-6">
            <div className="grid gap-5">
              <div className="relative h-[390px] overflow-hidden rounded-2xl border border-white/12 bg-black/35">
                <div className="lev-grid-field absolute inset-0 opacity-[0.14]" />
                <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/70 to-transparent" />
                <div className="absolute right-4 top-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  trai\ processing
                </div>

                {integrationFlowItems.map((item, index) => {
                  const laneTop = integrationFlowLanes[index % integrationFlowLanes.length];

                  return (
                    <motion.div
                      key={item.id}
                      style={{ top: laneTop }}
                      initial={{ x: shouldReduceMotion ? 0 : -24, opacity: shouldReduceMotion ? 1 : 0 }}
                      animate={{
                        x: shouldReduceMotion ? 0 : [-24, 120, 252],
                        opacity: shouldReduceMotion ? 1 : [0, 1, 1, 0],
                      }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 4.4,
                        delay: shouldReduceMotion ? 0 : index * 0.42,
                        repeat: shouldReduceMotion ? 0 : Number.POSITIVE_INFINITY,
                        repeatDelay: shouldReduceMotion ? 0 : 0.55,
                        ease: "easeInOut",
                      }}
                      className={`absolute left-4 flex h-11 items-center rounded-xl border shadow-[0_8px_22px_-14px_rgba(0,0,0,0.8)] ${
                        item.kind === "logo"
                          ? "w-11 justify-center border-white/20 bg-white/95 p-2"
                          : "border-white/20 bg-[#121923]/95 px-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-200"
                      }`}
                    >
                      {item.kind === "logo" ? (
                        <Image src={item.src} alt={item.alt} width={22} height={22} className="h-[22px] w-[22px] object-contain" />
                      ) : (
                        <span className="whitespace-nowrap">{item.label}</span>
                      )}
                    </motion.div>
                  );
                })}

                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: [1, 1.03, 1],
                          boxShadow: [
                            "0 10px 30px -18px rgba(0,234,100,0.35)",
                            "0 18px 46px -20px rgba(0,234,100,0.5)",
                            "0 10px 30px -18px rgba(0,234,100,0.35)",
                          ],
                        }
                  }
                  transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] border border-emerald-300/35 bg-emerald-300/10 text-base font-semibold text-white"
                >
                  <BrandMark compact />
                </motion.div>
              </div>

            </div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-section lev-section--light mt-16"
        >
          <div className="rounded-[30px] border border-white/14 bg-[linear-gradient(135deg,rgba(0,234,100,0.3)_0%,rgba(20,184,166,0.18)_45%,rgba(12,16,24,0.95)_100%)] px-6 py-10 text-center sm:px-9">
            <h3 className="text-[clamp(1.9rem,4vw,2.8rem)] font-semibold text-white">Books that never fall</h3>
            <p className="mt-3 text-lg text-slate-100">your 24/7 finance hire</p>
            <p className="mt-2 text-sm text-slate-200/90">
              How Trail acts like an accountant: it stays active every day, not just at month close.
            </p>
            <div className="mt-7">
              <a href={calBookingUrl} className="lev-button lev-button--light">
                book demo
                <ArrowIcon />
              </a>
            </div>
          </div>
        </motion.section>

        <footer className="mt-20 border-t border-white/10 pt-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <BrandMark className="text-[1.3rem]" />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
                Modern Accounting, Made for India
              </p>
            </div>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-white">Resources</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {resourceLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="block transition hover:text-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Connect</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
                  <a
                    href="https://twitter.com/heytrail"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 transition hover:text-white"
                  >
                    <SocialIcon kind="x" />
                    X
                  </a>
                  <a
                    href="https://linkedin.com/company/get-trail/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 transition hover:text-white"
                  >
                    <SocialIcon kind="linkedin" />
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-5 text-sm text-slate-400">
            <p>© 2026 trai\</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
