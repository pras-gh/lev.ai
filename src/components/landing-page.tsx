"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
    message:
      "Yes, but GST outflow of Rs 1.1L will reduce free cash. Safe hiring budget: Rs X.",
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
    title: "Lev keeps books clean in real time",
    description:
      "Instead of month-end scramble, entries are categorized and reconciled continuously.",
    points: ["Live reconciliation", "Auto-clean ledger", "Month-close readiness"],
  },
  {
    title: "Lev flags GST and cash risk before deadlines",
    description:
      "You get early warning on GST dues, ITC mismatches, and cash runway pressure.",
    points: ["GST due alerts", "ITC mismatch checks", "Cash runway warnings"],
  },
  {
    title: "Lev answers founder finance decisions instantly",
    description:
      "Ask financing, hiring, and compliance questions and get direct answer context.",
    points: ["Hiring affordability", "Compliance confidence", "Cash-safe budgets"],
  },
];

const integrationFlow: IntegrationFlowItem[] = [
  { key: "banks", label: "Banks", top: "9%" },
  { key: "razorpay", label: "Razorpay", top: "24%" },
  { key: "zoho-books", label: "Zoho Books", top: "39%" },
  { key: "tally", label: "Tally Exports", top: "54%" },
  { key: "slack", label: "Slack", top: "69%" },
  { key: "whatsapp", label: "WhatsApp", top: "84%" },
];

const integrationOutcomes = [
  "GST risk warnings before deadlines",
  "Month-close books ready for review",
  "Founder-ready answers in plain English",
];

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
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [activeSlide, setActiveSlide] = useState(0);

  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const revealElements = gsap.utils.toArray<HTMLElement>("[data-gsap='reveal']");
      revealElements.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 42 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 84%",
              once: true,
            },
          }
        );
      });

      const parallaxElements = gsap.utils.toArray<HTMLElement>("[data-gsap='parallax']");
      parallaxElements.forEach((el, index) => {
        gsap.to(el, {
          yPercent: index % 2 === 0 ? -10 : -6,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            scrub: 1,
          },
        });
      });

      const flowArea = document.querySelector<HTMLElement>("[data-flow-area]");
      if (flowArea) {
        const flowCards = gsap.utils.toArray<HTMLElement>("[data-flow-chip]");
        const areaWidth = flowArea.clientWidth;
        const hub = flowArea.querySelector<HTMLElement>("[data-flow-hub]");

        flowCards.forEach((card, index) => {
          const cardWidth = card.clientWidth;
          const startX = 0;
          const hubX = Math.max(areaWidth * 0.47 - cardWidth / 2, 24);
          const endX = Math.max(areaWidth - cardWidth - 12, hubX + 80);

          gsap
            .timeline({ repeat: -1, repeatDelay: 0.45, delay: index * 0.62 })
            .set(card, { x: startX, autoAlpha: 0 })
            .to(card, { autoAlpha: 1, duration: 0.28, ease: "power2.out" })
            .to(card, { x: hubX, duration: 1.45, ease: "power2.inOut" })
            .to(card, { x: endX, duration: 1.25, ease: "power1.inOut" })
            .to(card, { autoAlpha: 0, duration: 0.25, ease: "power1.out" }, "-=0.14");
        });

        if (hub) {
          gsap.to(hub, {
            boxShadow: "0 0 0 10px rgba(34, 197, 94, 0.06), 0 20px 50px -24px rgba(34, 197, 94, 0.42)",
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        }
      }
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [prefersReducedMotion]);

  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featureSlides.length);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="relative min-h-screen overflow-x-clip pb-20 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(34,197,94,0.12),transparent_36%),radial-gradient(circle_at_84%_14%,rgba(16,185,129,0.08),transparent_34%),linear-gradient(180deg,#020404_0%,#030505_52%,#060b08_100%)]" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1220px] items-center justify-between px-6 py-4 sm:px-8">
          <Link href="/" aria-label="Lev home">
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
          <Link href="/get-lev" className="lev-button lev-button--dark">
            Book Demo
            <ArrowIcon />
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-[1220px] px-6 pt-26 sm:px-8 sm:pt-28">
        <section className="grid min-h-[calc(100vh-8rem)] gap-10 py-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div data-gsap="reveal">
            <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
              In-house finance hire
            </p>
            <h1 className="mt-5 max-w-xl text-[clamp(2.6rem,8vw,5.2rem)] leading-[0.92] font-semibold tracking-[-0.03em] text-white">
              Finance should not be stressful.
              <span className="mt-2 block text-emerald-200">
                Introducing <BrandMark compact className="text-white" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Lev continuously keeps books accurate, closes month on time, flags GST and cash risk
              early, and answers founder finance questions 24/7.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/get-lev" className="lev-button lev-button--emerald">
                Book Demo
                <ArrowIcon />
              </Link>
              <a href="#integrations" className="lev-button lev-button--outline">
                See live flow
                <ArrowIcon />
              </a>
            </div>
          </div>

          <div className="relative" data-gsap="reveal">
            <div
              data-gsap="parallax"
              className="glass-panel relative overflow-hidden rounded-[30px] border border-emerald-200/16 p-5 shadow-[0_34px_80px_-56px_rgba(34,197,94,0.44)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Lev Live Desk</p>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-300/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                  Live
                </span>
              </div>
              <div className="space-y-3">
                {gstAndCashAlerts.map((alert) => (
                  <div
                    key={alert}
                    className="rounded-2xl border border-emerald-200/14 bg-black/35 px-4 py-3 text-sm text-emerald-50 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/26"
                  >
                    {alert}
                  </div>
                ))}
              </div>
            </div>
            <div
              data-gsap="parallax"
              className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-xs text-emerald-100 backdrop-blur-sm sm:block"
            >
              Cash runway impact forecast ready
            </div>
            <div
              data-gsap="parallax"
              className="absolute -right-3 -top-5 hidden rounded-2xl border border-emerald-300/25 bg-emerald-400/8 px-4 py-3 text-xs text-emerald-100 backdrop-blur-sm sm:block"
            >
              ITC mismatch caught before filing
            </div>
          </div>
        </section>

        <section id="features" className="mt-18" data-gsap="reveal">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Feature carousel</p>
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

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-panel rounded-[26px] border border-white/12 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                0{activeSlide + 1} / 03
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">{featureSlides[activeSlide].title}</h3>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
                {featureSlides[activeSlide].description}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {featureSlides[activeSlide].points.map((point) => (
                  <div
                    key={point}
                    className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[26px] border border-white/12 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Live conversation</p>
              <div className="mt-4 space-y-3">
                {chatSimulation.map((entry, index) => (
                  <div
                    key={`${entry.role}-${index}`}
                    className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      entry.role === "founder"
                        ? "ml-auto border border-white/12 bg-white/8 text-slate-200"
                        : "border border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">
                      {entry.role === "founder" ? "You" : "Lev"}
                    </p>
                    {entry.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-18 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-gsap="reveal">
          {[
            "Always-on reconciliation",
            "Proactive GST intelligence",
            "Cash-aware decision support",
            "Clean close-ready financials",
          ].map((item) => (
            <div
              key={item}
              className="glass-panel rounded-2xl border border-white/10 px-4 py-4 text-sm font-semibold text-slate-200 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:shadow-[0_18px_36px_-24px_rgba(34,197,94,0.48)]"
            >
              {item}
            </div>
          ))}
        </section>

        <section id="integrations" className="mt-18" data-gsap="reveal">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Integrations</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Everything flows through <BrandMark compact className="text-white" />.
            </h2>
          </div>

          <div className="glass-panel rounded-[26px] border border-white/12 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
              <div
                data-flow-area
                className="relative h-[360px] overflow-hidden rounded-2xl border border-white/12 bg-black/35"
              >
                <div className="lev-grid-field absolute inset-0 opacity-[0.14]" />
                <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/65 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/65 to-transparent" />
                <div className="absolute left-4 top-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Connected apps
                </div>
                <div className="absolute right-4 top-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Lev outputs
                </div>

                {integrationFlow.map((item) => (
                  <div
                    key={item.key}
                    data-flow-chip
                    style={{ top: item.top }}
                    className="absolute left-4 flex items-center gap-3 rounded-xl border border-white/14 bg-black/75 px-3 py-2 text-sm text-slate-100 shadow-[0_8px_22px_-14px_rgba(0,0,0,0.8)]"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/6 text-emerald-200">
                      <IntegrationIcon integration={item.key} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </div>
                ))}

                <div
                  data-flow-hub
                  className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[22px] border border-emerald-300/35 bg-emerald-300/10 text-base font-semibold text-white"
                >
                  <BrandMark compact className="text-white" />
                </div>
              </div>

              <div className="space-y-3">
                {integrationOutcomes.map((outcome) => (
                  <div
                    key={outcome}
                    className="rounded-xl border border-white/12 bg-white/[0.05] px-4 py-4 text-sm font-medium text-slate-100"
                  >
                    {outcome}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-18" data-gsap="reveal">
          <div className="rounded-[28px] border border-white/14 bg-gradient-to-r from-emerald-500/15 via-emerald-500/8 to-black px-6 py-9 sm:px-9">
            <h3 className="max-w-2xl text-[clamp(1.8rem,3.5vw,2.7rem)] leading-[1.02] font-semibold text-white">
              Ready to make finance feel handled?
            </h3>
            <p className="mt-4 max-w-2xl text-lg text-slate-200">
              Book a demo and see how <BrandMark compact className="text-white" /> runs like your
              in-house finance hire.
            </p>
            <div className="mt-7">
              <Link href="/get-lev" className="lev-button lev-button--emerald">
                Book Demo
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>

        <footer className="mt-12 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/12 pt-5 text-sm">
            <p className="font-medium text-slate-400">© 2026 <BrandMark compact className="text-slate-300" /></p>
            <div className="flex items-center gap-5 text-slate-300">
              <a href="#features" className="transition hover:text-white">
                Features
              </a>
              <a href="#integrations" className="transition hover:text-white">
                Integrations
              </a>
              <Link href="/get-lev" className="transition hover:text-white">
                Book Demo
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
