"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

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

const financeUpdateBullets = [
  "Budget 2026 change impacts your depreciation",
  "GST claim applied automatically",
  "Books ready for month close",
];

const integrationApps = [
  { name: "Banks", short: "Ba", tone: "bg-[#0D355D] text-white" },
  { name: "Razorpay", short: "Rz", tone: "bg-[#1165F1] text-white" },
  { name: "Tally", short: "Ta", tone: "bg-[#2C5E3F] text-white" },
  { name: "Zoho Books", short: "Zo", tone: "bg-[#C11E38] text-white" },
  { name: "WhatsApp", short: "Wa", tone: "bg-[#159A4A] text-white" },
  { name: "Slack", short: "Sl", tone: "bg-[#512BD4] text-white" },
  { name: "Gmail", short: "Gm", tone: "bg-[#D04D39] text-white" },
  { name: "Drive", short: "Dr", tone: "bg-[#1A73E8] text-white" },
];

const integrationOutcomes = [
  "GST and compliance risks flagged early",
  "Books kept clean and close-ready",
  "Cash questions answered with context",
];

const financeFlowSteps = [
  {
    title: "Ingest",
    detail: "Lev syncs banks, payouts, books, and chat inputs.",
  },
  {
    title: "Reconcile",
    detail: "Entries are cleaned and categorized in real time.",
  },
  {
    title: "Detect",
    detail: "GST, ITC, and cash anomalies are flagged before deadline risk.",
  },
  {
    title: "Decide",
    detail: "Founders ask questions and get direct finance answers.",
  },
  {
    title: "Deliver",
    detail: "Close-ready books and clear updates are sent to the team.",
  },
];

const heroStats = [
  { label: "Month close", value: "On time" },
  { label: "GST and cash risks", value: "Flagged early" },
  { label: "Founder decisions", value: "Answer-ready" },
];

function arrowIcon() {
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

function fadeUp(shouldReduceMotion: boolean, delay = 0) {
  return {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 24,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : delay,
        duration: shouldReduceMotion ? 0 : 0.62,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };
}

function stagger(shouldReduceMotion: boolean, delayChildren = 0, gap = 0.12) {
  return {
    hidden: {},
    visible: {
      transition: {
        delayChildren: shouldReduceMotion ? 0 : delayChildren,
        staggerChildren: shouldReduceMotion ? 0 : gap,
      },
    },
  };
}

function AppChip({
  label,
  short,
  tone,
  shouldReduceMotion,
  index,
}: {
  label: string;
  short: string;
  tone: string;
  shouldReduceMotion: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.65 }}
      variants={fadeUp(shouldReduceMotion, 0.08 + index * 0.05)}
      className="rounded-[14px] border border-slate-900/10 bg-white p-2.5"
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[0.62rem] font-semibold uppercase tracking-[0.12em] ${tone}`}
        >
          {short}
        </div>
        <p className="text-xs font-semibold text-slate-700">{label}</p>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <div className="relative overflow-x-clip pb-18">
      <div className="pointer-events-none absolute -left-28 top-28 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl" />

      <header className="sticky top-0 z-30 border-b border-slate-900/7 bg-[rgba(247,243,235,0.84)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4 sm:px-8">
          <Link
            href="/"
            className="text-[1.08rem] font-semibold tracking-[-0.02em] text-slate-900"
            aria-label="Lev home"
          >
            Lev
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#what-lev-does" className="text-sm font-medium text-slate-700 transition hover:text-slate-900">
              What Lev does
            </a>
            <a href="#integrations" className="text-sm font-medium text-slate-700 transition hover:text-slate-900">
              Integrations
            </a>
          </nav>
          <Link href="/get-lev" className="lev-button">
            Get Lev
            {arrowIcon()}
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-8 w-full max-w-[1200px] px-6 sm:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger(shouldReduceMotion)}
          className="lev-soft-outline relative overflow-hidden rounded-[34px] px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12"
        >
          <div className="lev-grid-field pointer-events-none absolute inset-0 opacity-[0.18]" />
          <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-emerald-300/45 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 top-8 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
            <div>
              <motion.p
                variants={fadeUp(shouldReduceMotion)}
                className="inline-flex rounded-full border border-slate-900/15 bg-white/86 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"
              >
                In-house finance hire
              </motion.p>
              <motion.h1
                variants={fadeUp(shouldReduceMotion, 0.08)}
                className="mt-5 max-w-2xl text-[clamp(2.45rem,7vw,4.9rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-slate-950"
              >
                <span className="block">Accounting for</span>
                <span className="block">the modern era.</span>
                <span className="mt-2 block">
                  Introducing <span className="lev-highlight">Lev</span>
                  <span className="text-orange-500">.</span>
                </span>
              </motion.h1>
              <motion.p
                variants={fadeUp(shouldReduceMotion, 0.16)}
                className="mt-5 max-w-2xl text-[1.06rem] leading-relaxed"
              >
                Lev is your in-house AI finance hire: it keeps books accurate, closes month on
                time, flags GST and cash risks early, and gives decision-ready answers in seconds.
              </motion.p>
              <motion.div
                variants={fadeUp(shouldReduceMotion, 0.22)}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link href="/get-lev" className="lev-button">
                  Book demo
                  {arrowIcon()}
                </Link>
                <a href="#what-lev-does" className="lev-button lev-button--light">
                  What Lev does in 10 seconds
                  {arrowIcon()}
                </a>
              </motion.div>
              <motion.div
                variants={stagger(shouldReduceMotion, 0.28, 0.08)}
                className="mt-9 grid gap-3 sm:grid-cols-3"
              >
                {heroStats.map((item) => (
                  <motion.article
                    key={item.label}
                    variants={fadeUp(shouldReduceMotion)}
                    className="rounded-[22px] border border-slate-900/10 bg-white/82 px-4 py-4"
                  >
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                  </motion.article>
                ))}
              </motion.div>
            </div>

            <motion.div variants={fadeUp(shouldReduceMotion, 0.18)} className="relative">
              <div className="relative rounded-[28px] border border-slate-900/12 bg-slate-950/96 p-3 shadow-[0_34px_90px_-58px_rgba(15,23,42,0.9)]">
                <Image
                  src="/lev-command-center.svg"
                  alt="Lev finance command center interface"
                  width={1160}
                  height={760}
                  priority
                  className="w-full rounded-[24px]"
                />
              </div>
              <motion.ul
                variants={stagger(shouldReduceMotion, 0.35, 0.1)}
                className="absolute -left-2 top-8 w-[min(88%,310px)] space-y-2 sm:-left-6"
              >
                {gstAndCashAlerts.slice(0, 3).map((item) => (
                  <motion.li
                    key={item}
                    variants={fadeUp(shouldReduceMotion)}
                    className="rounded-[15px] border border-cyan-200/35 bg-cyan-100/90 px-3 py-2 text-xs font-medium text-slate-900 backdrop-blur-sm"
                  >
                    {item}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </div>
        </motion.section>

        <section id="what-lev-does" className="mt-20 space-y-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={stagger(shouldReduceMotion)}
            >
              <motion.p
                variants={fadeUp(shouldReduceMotion)}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
              >
                1. Proactively flags GST and cash risks
              </motion.p>
              <motion.h2
                variants={fadeUp(shouldReduceMotion, 0.08)}
                className="mt-3 max-w-xl text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-slate-950"
              >
                Most teams discover finance risk too late. Lev catches it early.
              </motion.h2>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-xl text-lg leading-relaxed">
                Lev monitors your finance stack continuously and alerts you before GST dues, ITC
                mismatches, or cash pressure become expensive.
              </motion.p>
            </motion.div>

            <motion.article
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={stagger(shouldReduceMotion, 0.1)}
              className="lev-soft-outline rounded-[30px] p-5 sm:p-6"
            >
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                Finance flow in Lev
              </p>
              <motion.ol variants={stagger(shouldReduceMotion, 0.08, 0.08)} className="space-y-2.5">
                {financeFlowSteps.map((step, index) => (
                  <motion.li
                    key={step.title}
                    variants={fadeUp(shouldReduceMotion)}
                    className="relative rounded-[18px] border border-slate-900/10 bg-white px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-[2px] inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-[11px] font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.detail}</p>
                      </div>
                    </div>
                    {index < financeFlowSteps.length - 1 ? (
                      <span className="pointer-events-none absolute -bottom-2 left-7 h-3 w-[1px] bg-slate-300" />
                    ) : null}
                  </motion.li>
                ))}
              </motion.ol>
            </motion.article>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
            <motion.article
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={stagger(shouldReduceMotion, 0.08)}
              className="lev-soft-outline rounded-[30px] p-5 sm:p-7"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                24/7 Finance Operator
              </p>
              <motion.ul variants={stagger(shouldReduceMotion, 0.12, 0.12)} className="mt-4 space-y-3">
                {chatSimulation.map((entry, index) => (
                  <motion.li
                    key={`${entry.role}-${index}`}
                    variants={fadeUp(shouldReduceMotion)}
                    className={`max-w-[96%] rounded-[18px] px-4 py-3 text-sm leading-relaxed ${
                      entry.role === "founder"
                        ? "ml-auto border border-slate-900/10 bg-white text-slate-700"
                        : "border border-slate-900/10 bg-slate-950 text-slate-100"
                    }`}
                  >
                    <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] opacity-70">
                      {entry.role === "founder" ? "You" : "Lev"}
                    </p>
                    {entry.message}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.article>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={stagger(shouldReduceMotion)}
            >
              <motion.p
                variants={fadeUp(shouldReduceMotion)}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
              >
                2. A dedicated finance hire working 24/7
              </motion.p>
              <motion.h2
                variants={fadeUp(shouldReduceMotion, 0.08)}
                className="mt-3 max-w-xl text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-slate-950"
              >
                Ask finance questions any time. Get direct, decision-ready answers.
              </motion.h2>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-xl text-lg leading-relaxed">
                Lev behaves like your always-on in-house finance lead, so founders move faster
                without guessing on hiring, compliance, or spending.
              </motion.p>
            </motion.div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={stagger(shouldReduceMotion)}
            >
              <motion.p
                variants={fadeUp(shouldReduceMotion)}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
              >
                3. Clear doubts + clean books
              </motion.p>
              <motion.h2
                variants={fadeUp(shouldReduceMotion, 0.08)}
                className="mt-3 max-w-xl text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-slate-950"
              >
                Fast founder clarity. Audit-ready books in the background.
              </motion.h2>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-xl text-lg leading-relaxed">
                Lev gives instant answers and keeps your accounting clean so month close stays
                predictable and confidence stays high.
              </motion.p>
            </motion.div>

            <motion.article
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={stagger(shouldReduceMotion, 0.12)}
              className="lev-soft-outline rounded-[30px] p-6 sm:p-7"
            >
              <motion.p variants={fadeUp(shouldReduceMotion)} className="text-xs font-semibold text-slate-500">
                Subject: Lev Finance Update
              </motion.p>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.08)} className="mt-4 text-sm leading-relaxed text-slate-600">
                Your operations digest is ready:
              </motion.p>
              <motion.ul variants={stagger(shouldReduceMotion, 0.16, 0.09)} className="mt-4 space-y-3">
                {financeUpdateBullets.map((lineItem) => (
                  <motion.li
                    key={lineItem}
                    variants={fadeUp(shouldReduceMotion)}
                    className="rounded-[16px] border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-800"
                  >
                    {lineItem}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.article>
          </div>
        </section>

        <section
          id="integrations"
          className="lev-soft-outline mt-20 overflow-hidden rounded-[34px] px-6 py-8 sm:px-10 sm:py-10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger(shouldReduceMotion)}
            className="space-y-8"
          >
            <div className="max-w-3xl">
              <motion.p
                variants={fadeUp(shouldReduceMotion)}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
              >
                Integrations flowing through Lev
              </motion.p>
              <motion.h2
                variants={fadeUp(shouldReduceMotion, 0.08)}
                className="mt-3 text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.98] font-semibold text-slate-950"
              >
                Your apps flow into Lev. Lev turns data into action.
              </motion.h2>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-2xl text-lg leading-relaxed">
                No extra dashboards. Lev connects to your existing stack, runs finance workflows in
                the background, and outputs clean decisions your team can trust.
              </motion.p>
            </div>

            <div className="relative rounded-[28px] border border-slate-900/10 bg-white/86 px-4 py-6 sm:px-7 sm:py-8">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {integrationApps.map((app, index) => (
                    <AppChip
                      key={app.name}
                      label={app.name}
                      short={app.short}
                      tone={app.tone}
                      shouldReduceMotion={shouldReduceMotion}
                      index={index}
                    />
                  ))}
                </div>

                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.65 }}
                  variants={fadeUp(shouldReduceMotion, 0.18)}
                  className="mx-auto flex h-28 w-28 items-center justify-center rounded-[26px] border border-slate-900/18 bg-slate-950 text-center text-sm font-semibold tracking-[0.1em] text-white shadow-[0_22px_60px_-45px_rgba(15,23,42,1)]"
                >
                  LEV
                </motion.div>

                <motion.ul
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.65 }}
                  variants={stagger(shouldReduceMotion, 0.2, 0.12)}
                  className="space-y-2.5"
                >
                  {integrationOutcomes.map((outcome) => (
                    <motion.li
                      key={outcome}
                      variants={fadeUp(shouldReduceMotion)}
                      className="rounded-[14px] border border-emerald-600/16 bg-emerald-50 px-4 py-3 text-sm font-medium text-slate-800"
                    >
                      {outcome}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>

              <div className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[80%] -translate-x-1/2 -translate-y-1/2 lg:block">
                <div className="h-[1px] w-[42%] bg-gradient-to-r from-transparent via-slate-400/60 to-slate-900/0" />
                <div className="ml-auto h-[1px] w-[42%] bg-gradient-to-r from-slate-900/0 via-slate-400/60 to-transparent" />
              </div>

              <motion.span
                initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.75 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: shouldReduceMotion ? 0 : 0.25 }}
                className="pointer-events-none absolute left-[43%] top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-500 lg:block"
              />
              <motion.span
                initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.75 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: shouldReduceMotion ? 0 : 0.48 }}
                className="pointer-events-none absolute left-[57%] top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500 lg:block"
              />
            </div>
          </motion.div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
          variants={stagger(shouldReduceMotion)}
          className="mt-16 rounded-[30px] border border-slate-900/10 bg-slate-950 px-6 py-9 text-slate-100 shadow-[0_30px_85px_-58px_rgba(15,23,42,1)] sm:px-10 sm:py-10"
        >
          <motion.h3
            variants={fadeUp(shouldReduceMotion)}
            className="max-w-2xl text-[clamp(1.8rem,3.8vw,2.8rem)] leading-[1.02] font-semibold"
          >
            Ready to run finance like a serious in-house team?
          </motion.h3>
          <motion.p variants={fadeUp(shouldReduceMotion, 0.08)} className="mt-4 max-w-2xl text-[1.05rem] text-slate-300">
            See how books stay accurate, close stays on time, and decisions stop being finance
            guesswork.
          </motion.p>
          <motion.div variants={fadeUp(shouldReduceMotion, 0.14)} className="mt-7">
            <Link href="/get-lev" className="lev-button bg-white text-slate-900 hover:bg-slate-200">
              Get Lev
              {arrowIcon()}
            </Link>
          </motion.div>
        </motion.section>

        <footer className="mt-10 pb-2">
          <div className="flex items-center justify-between border-t border-slate-900/12 pt-5 text-sm">
            <p className="font-medium text-slate-600">© 2026 Lev</p>
            <Link href="/get-lev" className="text-slate-700 transition hover:text-slate-900">
              Book demo
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
