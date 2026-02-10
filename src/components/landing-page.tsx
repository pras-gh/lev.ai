"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BrandMark } from "@/components/brand-mark";

type FeatureSlide = {
  title: string;
  description: string;
  points: string[];
};

const trustLogos = [
  "Razorpay",
  "Zoho Books",
  "Tally",
  "Slack",
  "WhatsApp",
  "Google Workspace",
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

const integrationFlow = [
  { label: "Banks", tone: "bg-emerald-500/20 border-emerald-400/30" },
  { label: "Razorpay", tone: "bg-cyan-500/20 border-cyan-400/30" },
  { label: "Zoho Books", tone: "bg-blue-500/20 border-blue-400/30" },
  { label: "Tally", tone: "bg-teal-500/20 border-teal-400/30" },
  { label: "Slack", tone: "bg-violet-500/20 border-violet-400/30" },
  { label: "WhatsApp", tone: "bg-green-500/20 border-green-400/30" },
];

const customerProfiles = [
  {
    key: "startups",
    title: "Startups",
    problem: "Need investor-ready numbers without hiring a full finance team too early.",
    outcome: "Lev closes books on time and keeps cash + GST risk visible for founders.",
  },
  {
    key: "agency",
    title: "Agency",
    problem: "Project-heavy cash movement makes margin and tax compliance hard to track.",
    outcome: "Lev centralizes inflows/outflows and flags cash + compliance issues early.",
  },
  {
    key: "more",
    title: "More",
    problem: "SMBs that need in-house finance discipline but cannot justify full-time overhead.",
    outcome: "Lev acts like a fractional finance hire running quietly in the background.",
  },
] as const;

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

export function LandingPage() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCustomer, setActiveCustomer] =
    useState<(typeof customerProfiles)[number]["key"]>("startups");

  const selectedCustomer = useMemo(
    () => customerProfiles.find((profile) => profile.key === activeCustomer) ?? customerProfiles[0],
    [activeCustomer]
  );

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
          yPercent: index % 2 === 0 ? -14 : -9,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            scrub: 1,
          },
        });
      });
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(16,185,129,0.24),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(20,184,166,0.2),transparent_34%),radial-gradient(circle_at_52%_82%,rgba(22,163,74,0.16),transparent_42%),linear-gradient(180deg,#030807_0%,#06120f_42%,#091916_100%)]" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-md">
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
            <a href="#customers" className="text-sm font-medium text-slate-300 transition hover:text-white">
              Customers
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
              <a href="#features" className="lev-button lev-button--outline">
                See live flow
                <ArrowIcon />
              </a>
            </div>
          </div>

          <div className="relative" data-gsap="reveal">
            <div
              data-gsap="parallax"
              className="glass-panel relative overflow-hidden rounded-[30px] border border-emerald-200/18 p-5 shadow-[0_38px_90px_-55px_rgba(16,185,129,0.45)]"
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
                    className="rounded-2xl border border-emerald-200/15 bg-black/35 px-4 py-3 text-sm text-emerald-50 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/30"
                  >
                    {alert}
                  </div>
                ))}
              </div>
            </div>
            <div
              data-gsap="parallax"
              className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-xs text-cyan-100 backdrop-blur-sm sm:block"
            >
              Cash runway impact forecast ready
            </div>
            <div
              data-gsap="parallax"
              className="absolute -right-3 -top-5 hidden rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100 backdrop-blur-sm sm:block"
            >
              ITC mismatch caught before filing
            </div>
          </div>
        </section>

        <section data-gsap="reveal" className="glass-panel mt-8 rounded-[26px] border border-white/10 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Trusted stack</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {trustLogos.map((logo) => (
              <div
                key={logo}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm font-semibold text-slate-200 transition duration-300 hover:border-emerald-300/40 hover:text-white"
              >
                {logo}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mt-18" data-gsap="reveal">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Feature carousel</p>
              <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
                Sticky finance ops, without hiring full-time too early.
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
              className="glass-panel rounded-2xl border border-white/10 px-4 py-4 text-sm font-semibold text-slate-200 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:shadow-[0_18px_36px_-24px_rgba(16,185,129,0.55)]"
            >
              {item}
            </div>
          ))}
        </section>

        <section id="integrations" className="mt-18" data-gsap="reveal">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Integrations</p>
            <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
              Everything flows through <BrandMark compact className="text-white" /> for action-ready outcomes.
            </h2>
          </div>

          <div className="glass-panel rounded-[26px] border border-white/12 p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="grid gap-3 sm:grid-cols-2">
                {integrationFlow.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold text-slate-100 ${item.tone} transition duration-300 hover:scale-[1.02]`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>

              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] border border-emerald-300/30 bg-emerald-300/10 text-base font-semibold tracking-[0.02em] text-white">
                <BrandMark compact className="text-white" />
              </div>

              <div className="space-y-3">
                {["GST risk warnings", "Clean books for close", "Founder-ready answers"].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-medium text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="customers" className="mt-18" data-gsap="reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            Businesses that need an in-house finance hire
          </p>
          <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-white">
            Ideal customers for <BrandMark compact className="text-white" />
          </h2>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.42fr_0.58fr]">
            <div className="glass-panel rounded-[24px] border border-white/12 p-4">
              <div className="space-y-2">
                {customerProfiles.map((profile) => (
                  <button
                    key={profile.key}
                    type="button"
                    onClick={() => setActiveCustomer(profile.key)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      activeCustomer === profile.key
                        ? "border-emerald-300/45 bg-emerald-300/15 text-white"
                        : "border-white/12 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    <span>{profile.title}</span>
                    <ArrowIcon />
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[24px] border border-white/12 p-6">
              <h3 className="text-2xl font-semibold text-white">{selectedCustomer.title}</h3>
              <p className="mt-4 text-base leading-relaxed text-slate-300">{selectedCustomer.problem}</p>
              <div className="mt-6 rounded-xl border border-emerald-300/25 bg-emerald-300/12 px-4 py-4 text-sm text-emerald-100">
                {selectedCustomer.outcome}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-18" data-gsap="reveal">
          <div className="rounded-[28px] border border-white/14 bg-gradient-to-r from-emerald-500/18 via-teal-500/12 to-cyan-500/16 px-6 py-9 sm:px-9">
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
