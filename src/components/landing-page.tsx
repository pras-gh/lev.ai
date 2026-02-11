"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#integrations", label: "Integrations" },
];

const heroIntegrations = [
  "Razorpay",
  "HDFC Bank",
  "ICICI",
  "SBI",
  "WhatsApp",
  "Telegram",
  "Zoho Books",
  "Stripe",
  "Rippling",
  "Shopify",
  "Metadata.io",
  "Cognism",
  "Slack",
  "and more",
];

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
    role: "trai",
    message: "Yes, but GST outflow of Rs 1.1L will reduce free cash. Safe hiring budget: Rs X.",
  },
  {
    role: "founder",
    message: "Do we need to worry about compliance this month?",
  },
  {
    role: "trai",
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

const featureCards = [
  {
    title: "AI scoring engine",
    description: "Automatic evaluation plus context-aware review notes for every candidate test.",
    glyph: "shield" as const,
  },
  {
    title: "Role-based test flows",
    description: "Create custom tracks for backend, frontend, data, and finance operations roles.",
    glyph: "ledger" as const,
  },
  {
    title: "Candidate signal dashboard",
    description: "See quality, speed, and consistency metrics in one clean review panel.",
    glyph: "statement" as const,
  },
  {
    title: "Compliance-first workflows",
    description: "Track GST, filings, and internal controls through one always-on operating layer.",
    glyph: "shield" as const,
  },
  {
    title: "Decision-ready exports",
    description: "Share hiring and finance reports instantly with stakeholders and advisors.",
    glyph: "cash" as const,
  },
  {
    title: "Automated follow-ups",
    description: "Push alerts to Gmail, WhatsApp, and Slack when critical thresholds are crossed.",
    glyph: "ledger" as const,
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "₹29,000/mo",
    description: "For early teams that need clean books and alert-driven finance operations.",
    points: ["Up to 3 entities", "Daily sync", "Gmail + Slack alerts"],
  },
  {
    name: "Growth",
    price: "₹79,000/mo",
    description: "For scaling teams running multi-account operations with tighter control.",
    points: ["Up to 10 entities", "Real-time risk flags", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For high-volume operations with advanced workflow and compliance coverage.",
    points: ["Unlimited entities", "Custom integrations", "Dedicated onboarding"],
  },
];

const footerColumns = [
  {
    title: "Product",
    links: ["Assessments", "Automations", "Integrations", "Analytics"],
  },
  {
    title: "Solutions",
    links: ["Startups", "Agencies", "Finance Teams", "Enterprise"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Partners", "Contact"],
  },
  {
    title: "Resources",
    links: ["Docs", "Pricing", "Security", "Help Center"],
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

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4 text-emerald-300">
      <path d="m10 2.6 2 4 4.4.7-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.7 2-4Z" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M7 5.2 14.4 10 7 14.8V5.2Z" fill="currentColor" />
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

function SocialIcon({ kind }: { kind: "x" | "linkedin" | "github" }) {
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

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M12 3.8a8.5 8.5 0 0 0-2.7 16.6v-2.8c-2.3.5-2.8-1-2.8-1-.4-.9-.9-1.2-.9-1.2-.8-.5 0-.5 0-.5.8 0 1.3.9 1.3.9.8 1.3 2 1 2.4.8.1-.5.3-.9.5-1.1-1.9-.2-3.8-1-3.8-4.2 0-1 .4-1.8 1-2.4-.1-.2-.4-1.1.1-2.2 0 0 .8-.3 2.6 1a8.8 8.8 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.1.2 2 .1 2.2.6.6 1 1.4 1 2.4 0 3.2-2 4-3.8 4.2.3.2.6.8.6 1.6v2.4A8.5 8.5 0 0 0 12 3.8Z" fill="currentColor" />
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

function CounterCard({
  label,
  target,
  prefix = "",
  suffix = "",
  shouldReduceMotion,
}: {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  shouldReduceMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(() => (shouldReduceMotion ? target : 0));

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    let frame = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || started) {
            return;
          }

          started = true;
          const startTime = performance.now();
          const duration = 900;

          const step = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            setValue(Math.round(progress * target));
            if (progress < 1) {
              frame = window.requestAnimationFrame(step);
            }
          };

          frame = window.requestAnimationFrame(step);
          observer.disconnect();
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [shouldReduceMotion, target]);

  return (
    <div ref={ref} className="glass-panel rounded-2xl border border-white/10 px-5 py-5">
      <p className="text-3xl font-semibold text-white">
        {prefix}
        {value.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-slate-300">{label}</p>
    </div>
  );
}

export function LandingPage() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeNotification, setActiveNotification] = useState(0);
  const [heroNotificationCount, setHeroNotificationCount] = useState(1);

  const heroVisibleNotifications = useMemo(
    () => levNotifications.slice(0, shouldReduceMotion ? 4 : Math.min(heroNotificationCount, 4)),
    [heroNotificationCount, shouldReduceMotion]
  );

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

    const interval = window.setInterval(() => {
      setHeroNotificationCount((prev) => (prev < 4 ? prev + 1 : prev));
    }, 600);

    return () => {
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_9%,rgba(0,234,100,0.07),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(0,234,100,0.04),transparent_34%),linear-gradient(180deg,#0a0c10_0%,#0c0f15_52%,#0a0c10_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-40 h-80 w-80 rounded-full bg-emerald-500/8 blur-3xl" />

      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-white/12 bg-[#0b0d12]/82 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            : "border-b border-transparent bg-[#0b0d12]/44 backdrop-blur-lg"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1220px] items-center justify-between px-6 py-4 sm:px-8">
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
            <Link href="/get-trail" className="lev-button lev-button--dark">
              Book Demo
              <ArrowIcon />
            </Link>
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
              className="border-t border-white/10 bg-[#0b0d12]/95 px-6 py-4 md:hidden"
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
                <Link href="/get-trail" onClick={() => setMobileOpen(false)} className="lev-button lev-button--emerald w-fit">
                  Book Demo
                  <ArrowIcon />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative mx-auto w-full max-w-[1220px] px-6 pt-26 sm:px-8 sm:pt-28">
        <section className="grid min-h-[calc(100vh-8rem)] gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <motion.div initial="hidden" animate="visible" variants={heroItem(shouldReduceMotion, 0)}>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                <StarIcon />
                In-house finance hire
              </p>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.15)}
              className="mt-6 max-w-2xl text-[clamp(2.8rem,8.2vw,4.6rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-white"
            >
              Hire Developers.
              <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
                Faster. Smarter.
              </span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.3)}
              className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-slate-300"
            >
              Screen, assess, and hire top technical talent with AI-powered coding tests and
              automated evaluations.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.45)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/get-trail" className="lev-button lev-button--emerald lev-cta-pulse">
                get trai\
                <ArrowIcon />
              </Link>
              <Link href="/get-trail" className="lev-button lev-button--outline">
                <PlayIcon />
                bookdemo
              </Link>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.58)}
              className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-400"
            >
              {heroIntegrations.map((company) => (
                <span key={company} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                  {company}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={heroItem(shouldReduceMotion, 0.6)}
            className="relative mx-auto w-full max-w-[560px]"
          >
            <div className="pointer-events-none absolute inset-x-12 top-10 h-56 rounded-full bg-emerald-500/18 blur-3xl" />

            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="relative z-10 mx-auto w-full max-w-[330px] rounded-[36px] border border-white/15 bg-[#121723] p-3 shadow-[0_34px_70px_-35px_rgba(0,0,0,0.95)]"
            >
              <div className="mx-auto mb-3 h-1.5 w-24 rounded-full bg-white/20" />
              <div className="rounded-[28px] border border-white/10 bg-[#0f141d] px-3 pb-3 pt-5">
                <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-slate-300">
                  <span>9:41</span>
                  <span>5G</span>
                </div>
                <div className="mb-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-medium text-slate-100">
                  <span className="inline-flex items-center gap-1.5">
                    <GmailIcon />
                    Notification Bar • Gmail • trai\
                  </span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {heroVisibleNotifications.map((notice) => (
                      <motion.div
                        key={notice.id}
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16, scale: shouldReduceMotion ? 1 : 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -12 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.44, ease: easing }}
                        className="rounded-xl border border-white/14 bg-white/12 px-3 py-3"
                      >
                        <p className="text-[11px] font-semibold text-white">{notice.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">{notice.message}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, 7, 0] }}
              transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="lev-float-soft absolute -left-2 top-16 w-[250px] rotate-[-7deg] rounded-2xl border border-white/12 bg-[#171c27]/95 px-4 py-3"
            >
              <p className="text-xs font-semibold text-emerald-200">High Refund Spike</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                Refunds increased 18% this week. Margin impact estimated: ₹32k.
              </p>
            </motion.div>

            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.3 }}
              className="lev-float-soft absolute -right-3 bottom-12 w-[240px] rotate-[6deg] rounded-2xl border border-white/12 bg-[#171c27]/95 px-4 py-3"
            >
              <p className="text-xs font-semibold text-emerald-200">Crunch Warning</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                At current inflows, cash will fall below 20 day runway by next Friday.
              </p>
            </motion.div>

            <div className="absolute -bottom-9 left-1/2 hidden w-full max-w-[460px] -translate-x-1/2 gap-2 lg:flex">
              {gstAndCashAlerts.slice(0, 2).map((alert) => (
                <div key={alert} className="rounded-xl border border-white/12 bg-[#141925]/90 px-3 py-2 text-[11px] text-slate-300">
                  {alert}
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-4 border-y border-white/10 py-6"
        >
          <div className="lev-marquee">
            <div className="lev-marquee-track">
              {[...callouts, ...callouts].map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="mx-3 inline-flex min-w-[320px] items-center gap-3 rounded-full border border-white/12 bg-[#141925] px-4 py-2"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/12 text-emerald-200">
                    <CalloutGlyph glyph={item.glyph} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

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
              whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: "0 24px 52px -34px rgba(0,234,100,0.45)" }}
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
              whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: "0 24px 52px -34px rgba(0,234,100,0.45)" }}
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
          viewport={{ once: true, amount: 0.22 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-20 border-t border-white/10 bg-black/25 pt-18"
        >
          <div className="mb-8">
            <h2 className="text-[clamp(1.8rem,3.4vw,2.5rem)] font-semibold text-white">
              Built to feel enterprise-grade, yet fast for founders.
            </h2>
          </div>

          <motion.div
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: shouldReduceMotion ? 0 : 0.1,
                },
              },
            }}
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {featureCards.map((card) => (
              <motion.article
                key={card.title}
                variants={revealInView(shouldReduceMotion)}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -4,
                        scale: 1.02,
                        borderColor: "rgba(0,234,100,0.45)",
                        boxShadow: "0 24px 44px -30px rgba(0,234,100,0.55)",
                      }
                }
                transition={{ duration: 0.2, ease: easing }}
                className="glass-panel rounded-2xl border border-white/10 px-5 py-5"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-300/12 text-emerald-100">
                  <CalloutGlyph glyph={card.glyph} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{card.description}</p>
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
              Everything flows through <BrandMark compact />.
            </h2>
          </div>

          <div className="glass-panel rounded-[26px] border border-white/12 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
              <div className="relative h-[380px] overflow-hidden rounded-2xl border border-white/12 bg-black/35">
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
                    initial={{ x: shouldReduceMotion ? 0 : -12, opacity: shouldReduceMotion ? 1 : 0 }}
                    animate={{
                      x: shouldReduceMotion ? 0 : [-12, 110, 250],
                      opacity: shouldReduceMotion ? 1 : [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 4.2,
                      delay: shouldReduceMotion ? 0 : index * 0.52,
                      repeat: shouldReduceMotion ? 0 : Number.POSITIVE_INFINITY,
                      repeatDelay: shouldReduceMotion ? 0 : 0.9,
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

              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-[338px] rounded-[40px] border border-white/18 bg-[#070708] p-3 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.98)]">
                  <div className="absolute left-1/2 top-3 h-7 w-[120px] -translate-x-1/2 rounded-full bg-black/85" />
                  <div className="rounded-[31px] border border-white/10 bg-[linear-gradient(180deg,#181b22_0%,#101319_44%,#0b0d12_100%)] px-3 pb-3 pt-12">
                    <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-slate-200">
                      <span>9:41</span>
                      <span>5G</span>
                    </div>

                    <div className="mb-2 rounded-xl border border-white/12 bg-white/10 px-3 py-2 text-[11px] font-medium text-slate-200">
                      <span className="inline-flex items-center gap-1.5">
                        <GmailIcon />
                        Notification Bar • Gmail • trai\
                      </span>
                    </div>

                    <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Notification Center
                    </p>

                    <div className="h-[356px] space-y-2.5 overflow-y-auto pr-1">
                      {levNotifications.map((notice, index) => {
                        const isActive = activeNotification === index;

                        return (
                          <motion.button
                            key={notice.id}
                            layout
                            type="button"
                            animate={{
                              opacity: isActive ? 1 : 0.64,
                              scale: isActive ? 1.02 : 0.94,
                            }}
                            transition={{
                              duration: shouldReduceMotion ? 0 : 0.24,
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
                              <div className="min-w-0 flex-1">
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
          className="mt-20 border-t border-white/10 bg-black/20 pt-18"
        >
          <div className="mb-7">
            <h2 className="text-[clamp(1.8rem,3.2vw,2.4rem)] font-semibold text-white">
              Decision velocity, measured.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <CounterCard label="Refund spike caught before deeper margin loss" target={18} suffix="%" shouldReduceMotion={shouldReduceMotion} />
            <CounterCard label="Gateway cost increase surfaced for renegotiation" target={22} suffix="%" shouldReduceMotion={shouldReduceMotion} />
            <CounterCard label="Runway alert window before critical threshold" target={20} suffix="d" shouldReduceMotion={shouldReduceMotion} />
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-20 border-t border-white/10 pt-18"
        >
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Pricing</p>
            <h2 className="mt-2 text-[clamp(1.8rem,3.2vw,2.5rem)] font-semibold text-white">
              Simple, flat pricing
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <motion.article
                key={plan.name}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -4,
                        scale: 1.015,
                        boxShadow: "0 24px 46px -30px rgba(0,234,100,0.55)",
                      }
                }
                transition={{ duration: 0.2, ease: easing }}
                className={`rounded-2xl border px-5 py-5 ${
                  plan.featured
                    ? "border-emerald-300/45 bg-emerald-300/[0.12]"
                    : "border-white/12 bg-[#141925]"
                }`}
              >
                <p className="text-sm font-semibold text-slate-200">{plan.name}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{plan.price}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{plan.description}</p>
                <div className="mt-5 space-y-2 text-sm text-slate-200">
                  {plan.points.map((point) => (
                    <p key={point}>• {point}</p>
                  ))}
                </div>
                <Link href="/get-trail" className="lev-button lev-button--outline mt-6">
                  Book Demo
                  <ArrowIcon />
                </Link>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={revealInView(shouldReduceMotion)}
          className="mt-20 border-t border-white/10 pt-18"
        >
          <div className="rounded-[30px] border border-white/14 bg-[linear-gradient(135deg,rgba(0,234,100,0.3)_0%,rgba(20,184,166,0.18)_45%,rgba(12,16,24,0.95)_100%)] px-6 py-10 text-center sm:px-9">
            <h3 className="text-[clamp(1.9rem,4vw,2.8rem)] font-semibold text-white">Books that never fall</h3>
            <p className="mt-3 text-lg text-slate-100">your 24/7 finance hire</p>
            <div className="mt-7">
              <Link href="/get-trail" className="lev-button lev-button--light">
                book demo
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </motion.section>

        <footer className="mt-20 border-t border-white/10 pt-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <BrandMark className="text-[1.3rem]" />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
                Premium finance operations platform for teams that need always-on accuracy and fast
                decisions.
              </p>
            </div>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <p className="text-sm font-semibold text-white">{column.title}</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    {column.links.map((link) => (
                      <a key={link} href="#" className="block transition hover:text-white">
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-5 text-sm text-slate-400">
            <p>© 2026 trai\</p>
            <div className="flex items-center gap-5">
              <a href="#" className="transition hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="transition hover:text-white">
                Terms
              </a>
            </div>
            <div className="flex items-center gap-3">
              <a href="#" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:text-white">
                <SocialIcon kind="x" />
              </a>
              <a href="#" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:text-white">
                <SocialIcon kind="linkedin" />
              </a>
              <a href="#" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:text-white">
                <SocialIcon kind="github" />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
