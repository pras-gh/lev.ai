"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

type FeatureSlide = {
  title: string;
  description: string;
  points: string[];
};

type IntegrationKey = "banks" | "razorpay" | "zoho-books" | "tally" | "slack" | "whatsapp";

type IntegrationFlowItem = {
  key: IntegrationKey;
  label: string;
  top: string;
};

type LevNotification = {
  id: string;
  title: string;
  message: string;
};

type Callout = {
  title: string;
  description: string;
  glyph: "ledger" | "shield" | "cash" | "statement";
};

const easing = [0.22, 1, 0.36, 1] as const;

const gstAndCashAlerts = [
  "GST payment due in 5 days - Rs 1.2L",
  "ITC claim ready - Rs 42,300",
  "Vendor mismatch may block ITC",
  "Cash runway tightening next week",
];

const chatSimulation = [
  {
    role: "founder",
    message: "Can we afford to hire next month?",
  },
  {
    role: "lev",
    message: "Yes, but GST outflow of Rs 1.1L will reduce free cash. Safe hiring budget: Rs X.",
  },
  {
    role: "founder",
    message: "Do we need to worry about compliance this month?",
  },
  {
    role: "lev",
    message: "No urgent risks. ITC mismatch flagged for one vendor.",
  },
] as const;

const featureSlides: FeatureSlide[] = [
  {
    title: "trai\\ keeps books clean in real time",
    description:
      "Instead of month-end scramble, entries are categorized and reconciled continuously.",
    points: ["Live reconciliation", "Auto-clean ledger", "Month-close readiness"],
  },
  {
    title: "trai\\ flags GST and cash risk before deadlines",
    description:
      "You get early warning on GST dues, ITC mismatches, and cash runway pressure.",
    points: ["GST due alerts", "ITC mismatch checks", "Cash runway warnings"],
  },
  {
    title: "trai\\ answers founder finance decisions instantly",
    description:
      "Ask financing, hiring, and compliance questions and get direct answer context.",
    points: ["Hiring affordability", "Compliance confidence", "Cash-safe budgets"],
  },
];

const integrationFlow: IntegrationFlowItem[] = [
  { key: "banks", label: "Banks", top: "10%" },
  { key: "razorpay", label: "Razorpay", top: "24%" },
  { key: "zoho-books", label: "Zoho Books", top: "38%" },
  { key: "tally", label: "Tally Exports", top: "52%" },
  { key: "slack", label: "Slack", top: "66%" },
  { key: "whatsapp", label: "WhatsApp", top: "80%" },
];

const levNotifications: LevNotification[] = [
  {
    id: "refund-spike",
    title: "High Refund Spike",
    message: "Refunds increased 18% this week. Margin impact estimated: ₹32k.",
  },
  {
    id: "gateway-charges",
    title: "Gateway Charge Spike",
    message: "Gateway charges crossed ₹21k this month (+22%). Worth renegotiating plan.",
  },
  {
    id: "gstr-ready",
    title: "GSTR-3B Draft Ready",
    message: "GSTR-3B draft is ready. Filing after 20th may trigger interest + penalty.",
  },
  {
    id: "budget-update",
    title: "Budget 2026 Update",
    message: "Budget 2026: Books updated automatically.",
  },
  {
    id: "healthy-month",
    title: "Monthly Health Snapshot",
    message: "This month looks healthy: Profit ₹3.1L, GST payable ₹1.2L, no compliance red flags.",
  },
  {
    id: "crunch-warning",
    title: "Crunch Warning",
    message: "At current inflows, cash will fall below 20 day runway by next Friday.",
  },
];

const callouts: Callout[] = [
  {
    title: "Always-on reconciliation",
    description: "trai\\ cleans entries and keeps books audit-ready all month.",
    glyph: "ledger",
  },
  {
    title: "Proactive GST intelligence",
    description: "trai\\ catches filing risk and ITC mismatches before deadline pain.",
    glyph: "shield",
  },
  {
    title: "Cash-aware decision support",
    description: "trai\\ turns inflows, outflows, and runway into practical decisions.",
    glyph: "cash",
  },
  {
    title: "Close-ready statements",
    description: "trai\\ delivers founder-ready statements without month-end scramble.",
    glyph: "statement",
  },
];

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

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <rect x="2" y="5" width="20" height="14" rx="2.8" fill="#ffffff" />
      <path d="M2 7.4v9.2l5.7-4.4V8.3L2 7.4Z" fill="#34A853" />
      <path d="M22 7.4v9.2l-5.7-4.4V8.3L22 7.4Z" fill="#4285F4" />
      <path d="M2 6.8 12 14.1 22 6.8V5.8c0-1.2-.9-2.1-2.1-2.1H4.1C2.9 3.7 2 4.6 2 5.8v1Z" fill="#EA4335" />
      <path d="m7.7 8.2 4.3 3.1 4.3-3.1V5.2L12 8.1 7.7 5.2v3Z" fill="#FBBC05" />
    </svg>
  );
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

function IntegrationIcon({ integration }: { integration: IntegrationKey }) {
  if (integration === "banks") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="M3.5 9 12 4.5 20.5 9M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3 19.5h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (integration === "razorpay") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="M7.5 4.5h7.5l1.5 3.2-4 8.3h-3l2.8-5.8H9.2L7.5 4.5Z" fill="currentColor" />
      </svg>
    );
  }

  if (integration === "zoho-books") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <rect x="2.2" y="7" width="4.6" height="10" rx="0.9" fill="#e53e3e" />
        <rect x="7.8" y="6" width="4.6" height="11" rx="0.9" fill="#38a169" />
        <rect x="13.4" y="7.5" width="4.6" height="9.5" rx="0.9" fill="#f59e0b" />
        <rect x="19" y="6.5" width="2.8" height="10.5" rx="0.8" fill="#3b82f6" />
      </svg>
    );
  }

  if (integration === "tally") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2" />
        <path d="M7 8h10M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (integration === "slack") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <rect x="4.5" y="10.2" width="5.2" height="3.5" rx="1.4" fill="#36C5F0" />
        <rect x="8.6" y="14" width="3.5" height="5.2" rx="1.4" fill="#2EB67D" />
        <rect x="10.3" y="4.6" width="3.5" height="5.2" rx="1.4" fill="#E01E5A" />
        <rect x="14.2" y="8.7" width="5.2" height="3.5" rx="1.4" fill="#ECB22E" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 11.2c0-2.2 1.7-3.8 3.8-3.8s3.8 1.6 3.8 3.8V16h-1.7v-2.3h-4.2V16H8.2v-4.8Z" fill="currentColor" />
      <path d="M10 13.1h4" stroke="#0a1b14" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function LandingPage() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeNotification, setActiveNotification] = useState(0);
  const [revealedNotifications, setRevealedNotifications] = useState(
    shouldReduceMotion ? levNotifications.length : 1
  );

  const visibleNotifications = useMemo(
    () => levNotifications.slice(0, Math.max(1, revealedNotifications)),
    [revealedNotifications]
  );
  const clampedActiveNotification = Math.min(
    activeNotification,
    Math.max(0, visibleNotifications.length - 1)
  );

  useEffect(() => {
    if (shouldReduceMotion) {
      const timeout = window.setTimeout(() => {
        setRevealedNotifications(levNotifications.length);
      }, 0);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    const resetTimeout = window.setTimeout(() => {
      setRevealedNotifications(1);
    }, 0);

    const interval = window.setInterval(() => {
      setRevealedNotifications((prev) => {
        if (prev >= levNotifications.length) {
          window.clearInterval(interval);
          return prev;
        }

        return prev + 1;
      });
    }, 600);

    return () => {
      window.clearTimeout(resetTimeout);
      window.clearInterval(interval);
    };
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featureSlides.length);
    }, 5200);

    return () => {
      window.clearInterval(interval);
    };
  }, [shouldReduceMotion]);

  return (
    <div className="relative min-h-screen overflow-x-clip pb-20 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_9%,rgba(34,197,94,0.05),transparent_32%),radial-gradient(circle_at_84%_16%,rgba(34,197,94,0.03),transparent_34%),linear-gradient(180deg,#010202_0%,#020303_52%,#030403_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-48 h-72 w-72 rounded-full bg-emerald-500/8 blur-3xl" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/58 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1220px] items-center justify-between px-6 py-4 sm:px-8">
          <Link href="/" aria-label="trai\\ home">
            <BrandMark className="text-[1.1rem] font-semibold tracking-[-0.02em] text-white" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Features
            </a>
            <a href="#integrations" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Integrations
            </a>
          </nav>
          <Link href="/get-trail" className="lev-button lev-button--dark">
            Book Demo
            <ArrowIcon />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1220px] px-6 pt-26 sm:px-8 sm:pt-28">
        <section className="grid min-h-[calc(100vh-8rem)] gap-10 py-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <motion.div initial="hidden" animate="visible" variants={heroItem(shouldReduceMotion, 0)}>
              <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                In-house finance hire
              </p>
              <h1 className="mt-5 max-w-xl text-[clamp(2.6rem,8vw,5.2rem)] leading-[0.92] font-semibold tracking-[-0.03em] text-white">
                Finance should not be stressful.
                <span className="mt-2 block text-emerald-200">
                  Introducing <BrandMark compact className="text-white" />
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.15)}
              className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300"
            >
              trai\ continuously keeps books accurate, closes month on time, flags GST and cash risk
              early, and answers founder finance questions 24/7.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.3)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/get-trail" className="lev-button lev-button--emerald">
                Book Demo
                <ArrowIcon />
              </Link>
              <a href="#integrations" className="lev-button lev-button--outline">
                See live flow
                <ArrowIcon />
              </a>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={heroItem(shouldReduceMotion, 0.45)}
            className="relative"
          >
            <div className="glass-panel relative overflow-hidden rounded-[30px] border border-emerald-200/16 p-5 shadow-[0_34px_80px_-56px_rgba(34,197,94,0.44)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                  trai\ Live Desk
                </p>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                  Live
                </span>
              </div>
              <div className="space-y-3">
                {gstAndCashAlerts.map((alert) => (
                  <motion.div
                    key={alert}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            y: -2,
                            scale: 1.01,
                            borderColor: "rgba(110, 231, 183, 0.4)",
                          }
                    }
                    transition={{ duration: 0.2, ease: easing }}
                    className="rounded-2xl border border-emerald-200/14 bg-black/35 px-4 py-3 text-sm text-emerald-50"
                  >
                    {alert}
                  </motion.div>
                ))}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.55, delay: shouldReduceMotion ? 0 : 0.62, ease: easing }}
              className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-xs text-emerald-100 backdrop-blur-sm sm:block"
            >
              Cash runway impact forecast ready
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.55, delay: shouldReduceMotion ? 0 : 0.7, ease: easing }}
              className="absolute -right-3 -top-5 hidden rounded-2xl border border-emerald-300/25 bg-emerald-400/8 px-4 py-3 text-xs text-emerald-100 backdrop-blur-sm sm:block"
            >
              ITC mismatch caught before filing
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-20 border-t border-white/10 pt-18"
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">About trai\</p>
              <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
                Full finance flow, without hiring full-time too early.
              </h2>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              {featureSlides.map((_, index) => (
                <button
                  key={`feature-dot-${index}`}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Go to feature ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    activeSlide === index ? "w-8 bg-emerald-300" : "w-2.5 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: "0 24px 52px -34px rgba(34,197,94,0.45)" }}
              transition={{ duration: 0.2, ease: easing }}
              className="glass-panel rounded-[24px] border border-white/12 p-5 sm:p-6 lg:max-w-[520px]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                0{activeSlide + 1} / 03
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{featureSlides[activeSlide].title}</h3>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
                {featureSlides[activeSlide].description}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {featureSlides[activeSlide].points.map((point) => (
                  <div
                    key={point}
                    className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: "0 24px 52px -34px rgba(34,197,94,0.45)" }}
              transition={{ duration: 0.2, ease: easing }}
              className="glass-panel rounded-[26px] border border-white/12 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Live conversation</p>
              <div className="mt-4 space-y-3">
                {chatSimulation.map((entry, index) => (
                  <motion.div
                    key={`${entry.role}-${index}`}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.7 }}
                    variants={revealInView(shouldReduceMotion, index * 0.08)}
                    className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      entry.role === "founder"
                        ? "ml-auto border border-white/12 bg-white/8 text-slate-200"
                        : "border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
                      {entry.role === "founder" ? "You" : "trai\\"}
                    </p>
                    {entry.message}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-20 border-t border-white/10 bg-black/20 pt-18"
        >
          <motion.div
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: shouldReduceMotion ? 0 : 0.1,
                },
              },
            }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {callouts.map((item) => (
              <motion.article
                key={item.title}
                variants={revealInView(shouldReduceMotion)}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -4,
                        scale: 1.02,
                        borderColor: "rgba(110, 231, 183, 0.42)",
                        boxShadow: "0 24px 44px -30px rgba(34,197,94,0.6)",
                      }
                }
                transition={{ duration: 0.2, ease: easing }}
                className="glass-panel rounded-2xl border border-white/10 px-4 py-4"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-300/10 text-emerald-100">
                  <CalloutGlyph glyph={item.glyph} />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.description}</p>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          id="integrations"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-20 border-t border-white/10 pt-18"
        >
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Integrations</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Everything flows through <BrandMark compact className="text-white" />.
            </h2>
          </div>

          <div className="glass-panel rounded-[26px] border border-white/12 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
              <div className="relative h-[360px] overflow-hidden rounded-2xl border border-white/12 bg-black/35">
                <div className="lev-grid-field absolute inset-0 opacity-[0.14]" />
                <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/70 to-transparent" />
                <div className="absolute left-4 top-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Connected apps
                </div>
                <div className="absolute right-4 top-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  trai\ processing
                </div>

                {integrationFlow.map((item, index) => (
                  <motion.div
                    key={item.key}
                    style={{ top: item.top }}
                    initial={{ x: shouldReduceMotion ? 0 : -18, opacity: shouldReduceMotion ? 1 : 0 }}
                    animate={{
                      x: shouldReduceMotion ? 0 : [-18, 110, 254],
                      opacity: shouldReduceMotion ? 1 : [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 4.4,
                      delay: shouldReduceMotion ? 0 : index * 0.54,
                      repeat: shouldReduceMotion ? 0 : Number.POSITIVE_INFINITY,
                      repeatDelay: shouldReduceMotion ? 0 : 1.15,
                      ease: "easeInOut",
                    }}
                    className="absolute left-4 flex items-center gap-3 rounded-xl border border-white/14 bg-black/75 px-3 py-2 text-sm text-slate-100 shadow-[0_8px_22px_-14px_rgba(0,0,0,0.8)]"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/6 text-emerald-200">
                      <IntegrationIcon integration={item.key} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </motion.div>
                ))}

                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: [1, 1.03, 1],
                          boxShadow: [
                            "0 10px 30px -18px rgba(34,197,94,0.35)",
                            "0 18px 46px -20px rgba(34,197,94,0.5)",
                            "0 10px 30px -18px rgba(34,197,94,0.35)",
                          ],
                        }
                  }
                  transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] border border-emerald-300/35 bg-emerald-300/10 text-base font-semibold text-white"
                >
                  <BrandMark compact className="text-white" />
                </motion.div>
              </div>

              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-[338px] rounded-[40px] border border-white/18 bg-[#070708] p-3 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.98)]">
                  <div className="absolute left-1/2 top-3 h-7 w-[120px] -translate-x-1/2 rounded-full bg-black/85" />
                  <div className="rounded-[31px] border border-white/10 bg-[linear-gradient(180deg,#181b22_0%,#101319_44%,#0b0d12_100%)] px-3 pb-3 pt-12">
                    <div
                      className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-slate-200"
                      style={{
                        fontFamily:
                          '"SF Pro Text", "-apple-system", "BlinkMacSystemFont", "Segoe UI", sans-serif',
                      }}
                    >
                      <span>9:41</span>
                      <span>5G</span>
                    </div>

                    <div
                      className="mb-2 rounded-xl border border-white/12 bg-white/10 px-3 py-2 text-[11px] font-medium text-slate-200"
                      style={{ fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif' }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <GmailIcon />
                        Notification Bar • Gmail • trai\
                      </span>
                    </div>

                    <p
                      className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                      style={{
                        fontFamily:
                          '"SF Pro Text", "-apple-system", "BlinkMacSystemFont", "Segoe UI", sans-serif',
                      }}
                    >
                      Notification Center
                    </p>

                    <div className="h-[356px] space-y-2.5 overflow-y-auto pr-1">
                      <AnimatePresence mode="popLayout">
                        {visibleNotifications.map((notice, index) => {
                          const isActive = clampedActiveNotification === index;

                          return (
                            <motion.button
                              key={notice.id}
                              layout
                              type="button"
                              initial={{
                                opacity: 0,
                                y: shouldReduceMotion ? 0 : 16,
                                scale: shouldReduceMotion ? 1 : 0.97,
                              }}
                              animate={{
                                opacity: isActive ? 1 : 0.67,
                                y: 0,
                                scale: isActive ? 1.02 : 0.94,
                              }}
                              exit={{
                                opacity: 0,
                                y: shouldReduceMotion ? 0 : -14,
                                scale: shouldReduceMotion ? 1 : 0.95,
                              }}
                              transition={{
                                duration: shouldReduceMotion ? 0 : 0.45,
                                ease: easing,
                              }}
                              onMouseMove={() => setActiveNotification(index)}
                              onMouseEnter={() => setActiveNotification(index)}
                              onFocus={() => setActiveNotification(index)}
                              onClick={() => setActiveNotification(index)}
                              className={`w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200 ${
                                isActive
                                  ? "border-white/30 bg-white/24 shadow-[0_20px_36px_-25px_rgba(255,255,255,0.32)]"
                                  : "border-white/10 bg-white/10"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/20 bg-white/90 text-[#5f6368]">
                                  <GmailIcon />
                                </span>
                                <div
                                  className="min-w-0 flex-1"
                                  style={{ fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif' }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-medium text-slate-200">Gmail • trai\</p>
                                    <p className="text-[10px] font-medium text-slate-400">now</p>
                                  </div>
                                  <p className="truncate text-[12px] font-semibold text-white">{notice.title}</p>
                                  <p className="mt-0.5 text-[12px] leading-[1.35] text-slate-200">{notice.message}</p>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-20 border-t border-white/10 pt-18"
        >
          <motion.div
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    y: -3,
                    boxShadow: "0 26px 55px -34px rgba(34,197,94,0.42)",
                  }
            }
            transition={{ duration: 0.2, ease: easing }}
            className="rounded-[28px] border border-white/14 bg-gradient-to-r from-emerald-500/8 via-emerald-500/4 to-black px-6 py-9 sm:px-9"
          >
            <h3 className="max-w-2xl text-[clamp(1.8rem,3.5vw,2.7rem)] leading-[1.02] font-semibold text-white">
              Ready to make finance feel handled?
            </h3>
            <p className="mt-4 max-w-2xl text-lg text-slate-200">
              Book a demo and see how <BrandMark compact className="text-white" /> runs like your
              in-house finance hire.
            </p>
            <div className="mt-7">
              <Link href="/get-trail" className="lev-button lev-button--emerald">
                Book Demo
                <ArrowIcon />
              </Link>
            </div>
          </motion.div>
        </motion.section>

        <footer className="mt-12 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/12 pt-5 text-sm">
            <p className="font-medium text-slate-400">
              © 2026 <BrandMark compact className="text-slate-300" />
            </p>
            <div className="flex items-center gap-5 text-slate-300">
              <a href="#features" className="transition hover:text-white">
                Features
              </a>
              <a href="#integrations" className="transition hover:text-white">
                Integrations
              </a>
              <Link href="/get-trail" className="transition hover:text-white">
                Book Demo
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
