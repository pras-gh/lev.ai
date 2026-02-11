"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Lenis from "@studio-freight/lenis";
import { BrandMark } from "@/components/brand-mark";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

type FeatureSlide = {
  title: string;
  description: string;
  points: string[];
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

type WalkthroughStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  highlights: string[];
  theme: "risk" | "close" | "answer";
};

const easing = [0.22, 1, 0.36, 1] as const;
const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#integrations", label: "Integrations" },
];

const chatSimulation = [
  {
    role: "you",
    message: "Can we afford to hire next month?",
  },
  {
    role: "trai",
    message: "Yes, but GST outflow of Rs 1.1L will reduce free cash. Safe hiring budget: Rs X.",
  },
  {
    role: "you",
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
    title: "trai\\ answer instantly",
    description:
      "Ask financing, hiring, and compliance questions and get direct answer context.",
    points: ["Hiring affordability", "Compliance confidence", "Cash-safe budgets"],
  },
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

const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "risk-monitoring",
    label: "Chapter 01",
    title: "Risk feed before issues become fires",
    description:
      "trai\\ continuously monitors transactions, GST exposure, and runway signals so founders are never surprised late.",
    highlights: ["GST risk flag in 5 days", "ITC mismatch surfaced early", "Cash runway alert before crunch"],
    theme: "risk",
  },
  {
    id: "month-close",
    label: "Chapter 02",
    title: "Month-close happens in the background",
    description:
      "Entries are reconciled throughout the month and statements stay clean, so close-week is review time, not recovery time.",
    highlights: ["Ledger reconciliation complete", "Expense categorization auto-synced", "Founder-ready statements prepared"],
    theme: "close",
  },
  {
    id: "instant-answers",
    label: "Chapter 03",
    title: "Get operator-grade answers instantly",
    description:
      "Ask finance questions in plain language and get context-aware answers grounded in your live books and compliance posture.",
    highlights: ["Hiring budget with GST impact", "Compliance status summary", "Cash-safe spend recommendation"],
    theme: "answer",
  },
];

const INTRO_WORD = "Introducing";
type IntroPhase = "typing" | "flip" | "get";

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
      y: shouldReduceMotion ? 0 : 60,
      scale: shouldReduceMotion ? 1 : 0.96,
      filter: shouldReduceMotion ? "blur(0px)" : "blur(12px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: shouldReduceMotion ? 0 : 0.88,
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

function WalkthroughDeviceScreen({ step }: { step: WalkthroughStep }) {
  if (step.theme === "risk") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-300/30 bg-amber-200/10 px-3 py-2 text-[11px] text-amber-100">
          GST payment due in 5 days • ₹1.2L
        </div>
        <div className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-[11px] text-rose-100">
          Vendor mismatch may block ITC claim
        </div>
        <div className="rounded-xl border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-[11px] text-sky-100">
          Cash runway projected below 20 days next Friday
        </div>
      </div>
    );
  }

  if (step.theme === "close") {
    return (
      <div className="space-y-2.5">
        {[
          "Bank and gateway entries reconciled",
          "Expense rules applied to all new rows",
          "GSTR-3B draft generated",
          "P&L and balance sheet ready for review",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-xl border border-emerald-300/22 bg-emerald-300/10 px-3 py-2">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-300 text-[10px] font-semibold text-emerald-950">
              ✓
            </span>
            <p className="text-[11px] text-emerald-100">{item}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="ml-auto max-w-[78%] rounded-xl border border-white/14 bg-white/8 px-3 py-2 text-[11px] text-slate-200">
        Can we hire one more engineer next month?
      </div>
      <div className="max-w-[84%] rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[11px] text-emerald-100">
        Yes. After GST outflow, safe budget is ₹X without reducing runway below 45 days.
      </div>
      <div className="ml-auto max-w-[78%] rounded-xl border border-white/14 bg-white/8 px-3 py-2 text-[11px] text-slate-200">
        Any compliance risk this month?
      </div>
      <div className="max-w-[84%] rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[11px] text-emerald-100">
        No urgent flags. One vendor ITC mismatch needs follow-up.
      </div>
    </div>
  );
}

export function LandingPage() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const calBookingUrl = normalizeBookingUrl(siteConfig.calcom30MinUrl);
  const walkthroughRef = useRef<HTMLDivElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeNotification, setActiveNotification] = useState(0);
  const [isNotificationInteracting, setIsNotificationInteracting] = useState(false);
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0);
  const [introPhase, setIntroPhase] = useState<IntroPhase>(shouldReduceMotion ? "get" : "typing");
  const [introCount, setIntroCount] = useState(shouldReduceMotion ? INTRO_WORD.length : 0);
  const displayIntroPhase = shouldReduceMotion ? "get" : introPhase;
  const displayIntroCount = shouldReduceMotion ? INTRO_WORD.length : introCount;
  const activeWalkthrough = walkthroughSteps[walkthroughStepIndex];
  const { scrollYProgress: walkthroughProgress } = useScroll({
    target: walkthroughRef,
    offset: ["start start", "end end"],
  });
  const walkthroughDriftX = useTransform(walkthroughProgress, [0, 1], [-18, 18]);
  const walkthroughDriftY = useTransform(walkthroughProgress, [0, 1], [-26, 22]);
  const walkthroughBarWidth = useTransform(walkthroughProgress, [0, 1], ["0%", "100%"]);
  const walkthroughCardNearX = useTransform(walkthroughProgress, [0, 1], [-28, 28]);
  const walkthroughCardNearY = useTransform(walkthroughProgress, [0, 1], [14, -14]);
  const walkthroughCardFarX = useTransform(walkthroughProgress, [0, 1], [24, -24]);
  const walkthroughCardFarY = useTransform(walkthroughProgress, [0, 1], [-12, 12]);

  useMotionValueEvent(walkthroughProgress, "change", (latest) => {
    if (shouldReduceMotion) {
      return;
    }

    const raw = Math.floor(latest * walkthroughSteps.length);
    const next = Math.min(walkthroughSteps.length - 1, Math.max(0, raw));
    setWalkthroughStepIndex((prev) => (prev === next ? prev : next));
  });

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      lerp: 0.085,
    });
    let rafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };

    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [shouldReduceMotion]);

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
    let typeInterval = 0;

    const runCycle = () => {
      setIntroPhase("typing");
      setIntroCount(0);

      let localCount = 0;
      typeInterval = window.setInterval(() => {
        localCount += 1;
        setIntroCount(localCount);

        if (localCount >= INTRO_WORD.length) {
          window.clearInterval(typeInterval);
          timeouts.push(
            window.setTimeout(() => {
              setIntroPhase("flip");
            }, 360)
          );
          timeouts.push(
            window.setTimeout(() => {
              setIntroPhase("get");
            }, 900)
          );
          timeouts.push(
            window.setTimeout(() => {
              runCycle();
            }, 3200)
          );
        }
      }, 82);
    };

    runCycle();

    return () => {
      window.clearInterval(typeInterval);
      timeouts.forEach((timer) => window.clearTimeout(timer));
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

  useEffect(() => {
    if (shouldReduceMotion || isNotificationInteracting) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveNotification((prev) => (prev + 1) % levNotifications.length);
    }, 2500);

    return () => {
      window.clearInterval(interval);
    };
  }, [isNotificationInteracting, shouldReduceMotion]);

  return (
    <div className="relative min-h-screen overflow-x-clip pb-20 text-slate-100">
      <div className="lev-noise-overlay pointer-events-none absolute inset-0" />
      <div className="lev-background-drift pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_9%,rgba(0,234,100,0.07),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(0,234,100,0.04),transparent_34%),linear-gradient(180deg,#0a0c10_0%,#0c0f15_52%,#0a0c10_100%)]" />
      <motion.div
        animate={shouldReduceMotion ? undefined : { opacity: [0.18, 0.34, 0.18], scale: [1, 1.06, 1] }}
        transition={{ duration: 12.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(0,234,100,0.08),transparent_50%)] blur-3xl"
      />
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
            <a href={calBookingUrl} className="lev-button lev-button--dark">
              Book Demo
              <ArrowIcon />
            </a>
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
                <a href={calBookingUrl} onClick={() => setMobileOpen(false)} className="lev-button lev-button--emerald w-fit">
                  Book Demo
                  <ArrowIcon />
                </a>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative mx-auto w-full max-w-[1220px] px-6 pt-26 sm:px-8 sm:pt-28">
        <section className="lev-story-section relative flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-20 sm:px-10 sm:py-24 lg:py-28">
          <div className="relative z-10 mx-auto max-w-[1040px] text-center">
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
                    transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: easing }}
                    className="text-[clamp(3.5rem,8.3vw,5.8rem)] leading-[0.88] font-semibold tracking-[-0.04em] text-white [text-shadow:0_0_34px_rgba(255,255,255,0.34)]"
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
                    transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: easing }}
                    className="text-[clamp(3.5rem,8.3vw,5.8rem)] leading-[0.88] font-semibold tracking-[-0.04em] text-white [text-shadow:0_0_34px_rgba(255,255,255,0.34)] [transform-style:preserve-3d]"
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
              variants={heroItem(shouldReduceMotion, 0.08)}
              className="mx-auto mt-5 max-w-[980px] text-[clamp(3.5rem,8vw,5rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-slate-300"
            >
              your personal accountant <span className="text-emerald-300">24/7</span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.24)}
              className="mx-auto mt-6 max-w-3xl text-[1.08rem] leading-relaxed text-slate-300 sm:text-[1.16rem]"
            >
              Close your books on time, stay ahead of GST surprises, and get clear answers before
              you question.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={heroItem(shouldReduceMotion, 0.42)}
              className="mt-10 flex justify-center"
            >
              <a href={calBookingUrl} className="lev-button lev-button--emerald lev-cta-pulse">
                get trai\
                <ArrowIcon />
              </a>
            </motion.div>
          </div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-story-section mt-36 px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
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

        <section ref={walkthroughRef} className="mt-36">
          <div className="relative lg:h-[250vh]">
            <div className="lg:sticky lg:top-24 lg:h-[82vh]">
              <div className="lev-story-section relative h-full overflow-hidden p-4 sm:p-6 lg:p-8">
                <motion.div
                  style={{ x: walkthroughDriftX, y: walkthroughDriftY }}
                  className="pointer-events-none absolute -left-18 top-8 h-64 w-64 rounded-full bg-emerald-400/12 blur-3xl"
                />
                <motion.div
                  style={{ x: walkthroughDriftX, y: walkthroughDriftY }}
                  className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-300/8 blur-3xl"
                />

                <div className="relative z-10 grid h-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="flex h-full flex-col rounded-[24px] border border-white/12 bg-[#0d1118]/86 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                      Product Walkthrough
                    </p>
                    <h3 className="mt-3 text-[clamp(1.65rem,2.8vw,2.6rem)] leading-[1.03] font-semibold text-white">
                      Scroll through how trai\ runs finance, step by step.
                    </h3>
                    <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-slate-300">
                      This section is scroll-driven. The frame stays fixed while each chapter changes
                      like a live product demo.
                    </p>

                    <div className="mt-6 space-y-2.5">
                      {walkthroughSteps.map((step, index) => {
                        const isActive = walkthroughStepIndex === index;
                        return (
                          <div
                            key={step.id}
                            className={`rounded-xl border px-3 py-2 transition-all duration-300 ${
                              isActive
                                ? "border-emerald-300/34 bg-emerald-300/12 text-white"
                                : "border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-80">
                              {step.label}
                            </p>
                            <p className="mt-1 text-sm font-medium">{step.title}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="h-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div style={{ width: walkthroughBarWidth }} className="h-full rounded-full bg-emerald-300" />
                      </div>
                    </div>
                  </div>

                  <div className="relative flex h-full items-center justify-center">
                    <motion.div
                      style={{ x: walkthroughCardNearX, y: walkthroughCardNearY }}
                      className="pointer-events-none absolute -left-1 top-14 hidden xl:block"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, filter: shouldReduceMotion ? "blur(0px)" : "blur(10px)" }}
                        animate={
                          shouldReduceMotion
                            ? { opacity: 1, y: 0, filter: "blur(0px)" }
                            : { opacity: 1, y: [0, -12, 0], filter: "blur(0px)" }
                        }
                        transition={{ duration: shouldReduceMotion ? 0 : 5.2, repeat: shouldReduceMotion ? 0 : Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        className="w-44 rounded-2xl border border-white/16 bg-[#101624]/84 px-3 py-3 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-sm"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Live Alert</p>
                        <p className="mt-1 text-[11px] text-slate-200">GST outflow impact mapped before hiring call.</p>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      style={{ x: walkthroughCardFarX, y: walkthroughCardFarY }}
                      className="pointer-events-none absolute -right-2 bottom-18 hidden xl:block"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, filter: shouldReduceMotion ? "blur(0px)" : "blur(10px)" }}
                        animate={
                          shouldReduceMotion
                            ? { opacity: 1, y: 0, filter: "blur(0px)" }
                            : { opacity: 1, y: [0, -12, 0], filter: "blur(0px)" }
                        }
                        transition={{ duration: shouldReduceMotion ? 0 : 4.6, repeat: shouldReduceMotion ? 0 : Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        className="w-48 rounded-2xl border border-white/16 bg-[#101624]/84 px-3 py-3 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-sm"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">Close Status</p>
                        <p className="mt-1 text-[11px] text-slate-200">Statements ready without month-end scramble.</p>
                      </motion.div>
                    </motion.div>

                    <div className="w-full max-w-[620px] rounded-[28px] border border-white/14 bg-[#090d14]/92 p-4 shadow-[0_42px_78px_-46px_rgba(0,0,0,0.95)] sm:p-5">
                      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-300/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          trai\ live frame
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,#121722_0%,#0d121b_52%,#0b0f15_100%)] p-4 sm:p-5">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeWalkthrough.id}
                            initial={{
                              opacity: 0,
                              y: shouldReduceMotion ? 0 : 34,
                              scale: shouldReduceMotion ? 1 : 0.98,
                              filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)",
                            }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                            exit={{
                              opacity: 0,
                              y: shouldReduceMotion ? 0 : -16,
                              scale: shouldReduceMotion ? 1 : 0.98,
                              filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)",
                            }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.98, ease: easeOutExpo }}
                            className="min-h-[390px] space-y-4"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                              {activeWalkthrough.label}
                            </p>
                            <h4 className="text-2xl leading-tight font-semibold text-white">{activeWalkthrough.title}</h4>
                            <p className="max-w-[54ch] text-sm leading-relaxed text-slate-300">
                              {activeWalkthrough.description}
                            </p>

                            <WalkthroughDeviceScreen step={activeWalkthrough} />

                            <div className="grid gap-2 pt-2 sm:grid-cols-3">
                              {activeWalkthrough.highlights.map((item) => (
                                <div
                                  key={item}
                                  className="rounded-xl border border-white/12 bg-white/10 px-3 py-2 text-[11px] text-slate-200"
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <motion.section
          id="features"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-story-section mt-36 p-8 sm:p-10 lg:p-14"
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                About trail\
              </p>
              <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
                trail\ gives you real time audit ready book, with flat pricing
              </h2>
              <p className="mt-3 text-sm font-medium text-emerald-200">Simple, flat pricing.</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                trai\ answer instantly.
              </p>
              <div className="mt-4 space-y-3">
                {chatSimulation.map((entry, index) => (
                  <motion.div
                    key={`${entry.role}-${index}`}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.7 }}
                    variants={revealInView(shouldReduceMotion, index * 0.08)}
                    className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      entry.role === "you"
                        ? "ml-auto border border-white/12 bg-white/8 text-slate-200"
                        : "border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
                      {entry.role === "you" ? "You" : "trai\\"}
                    </p>
                    {entry.message}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          id="integrations"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={revealInView(shouldReduceMotion)}
          className="lev-story-section mt-36 p-8 sm:p-10 lg:p-14"
        >
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Integrations</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Everything flows through <BrandMark compact />
            </h2>
          </div>

          <div className="glass-panel rounded-[26px] border border-white/12 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
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

              <div className="flex items-center justify-center">
                <motion.div
                  animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
                  transition={{ duration: 5.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="relative w-full max-w-[332px] rounded-[36px] border border-white/15 bg-[#121723] p-3 shadow-[0_34px_70px_-35px_rgba(0,0,0,0.95)]"
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

                    <div
                      className="h-[360px] space-y-2 overflow-y-auto pr-1"
                      onMouseEnter={() => setIsNotificationInteracting(true)}
                      onMouseLeave={() => setIsNotificationInteracting(false)}
                    >
                      {levNotifications.map((notice, index) => {
                        const isActive = activeNotification === index;

                        return (
                          <motion.button
                            key={notice.id}
                            type="button"
                            animate={{
                              opacity: isActive ? 1 : 0.58,
                              scale: isActive ? 1.03 : 0.92,
                            }}
                            transition={{
                              duration: shouldReduceMotion ? 0 : 0.22,
                              ease: easing,
                            }}
                            onMouseEnter={() => setActiveNotification(index)}
                            onFocus={() => setActiveNotification(index)}
                            onClick={() => setActiveNotification(index)}
                            className={`w-full transform-gpu rounded-2xl border px-3 py-3 text-left transition-colors duration-200 [will-change:transform,opacity] ${
                              isActive
                                ? "border-white/28 bg-white/24 shadow-[0_20px_36px_-25px_rgba(255,255,255,0.34)]"
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
          className="lev-story-section mt-36 p-8 sm:p-10 lg:p-14"
        >
          <div className="rounded-[30px] border border-white/14 bg-[linear-gradient(135deg,rgba(0,234,100,0.3)_0%,rgba(20,184,166,0.18)_45%,rgba(12,16,24,0.95)_100%)] px-6 py-10 text-center sm:px-9">
            <h3 className="text-[clamp(1.9rem,4vw,2.8rem)] font-semibold text-white">Books that never fall</h3>
            <p className="mt-3 text-lg text-slate-100">your 24/7 finance hire</p>
            <div className="mt-7">
              <a href={calBookingUrl} className="lev-button lev-button--light">
                book demo
                <ArrowIcon />
              </a>
            </div>
          </div>
        </motion.section>

        <footer className="mt-36 border-t border-white/10 pt-14">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <BrandMark className="text-[1.3rem]" />
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
                Premium finance operations platform for teams that need always-on accuracy and fast
                decisions.
              </p>
            </div>
            <div className="grid gap-7 sm:grid-cols-1 lg:grid-cols-1">
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
