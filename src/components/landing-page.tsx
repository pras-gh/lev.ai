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
  "Your books are ready for close",
];

const integrationLogos = [
  "Banks",
  "Razorpay",
  "Tally Exports",
  "Zoho Books",
  "WhatsApp",
  "Slack",
  "Google Drive",
  "Gmail",
];

const heroStats = [
  { label: "Month close", value: "Always on time" },
  { label: "GST + ITC alerts", value: "Before deadlines" },
  { label: "Cash decisions", value: "Operator-level clarity" },
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

export function LandingPage() {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <div className="relative overflow-x-clip pb-24">
      <div className="pointer-events-none absolute -left-28 top-28 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-blue-300/40 blur-3xl" />

      <header className="sticky top-0 z-30 border-b border-slate-900/7 bg-[rgba(247,243,235,0.82)] backdrop-blur-md">
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
          <Link href="/book-demo" className="lev-button">
            Book a demo
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
                className="mt-5 max-w-2xl text-[clamp(2.5rem,7vw,4.9rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-slate-950"
              >
                <span className="block">Finance should not</span>
                <span className="block">be stressful.</span>
                <span className="lev-highlight mt-2 block">Lev runs it for you.</span>
              </motion.h1>
              <motion.p
                variants={fadeUp(shouldReduceMotion, 0.16)}
                className="mt-5 max-w-2xl text-[1.06rem] leading-relaxed"
              >
                Lev is an AI finance hire that proactively flags GST and cash risks, keeps your
                books clean, and answers your questions 24/7.
              </motion.p>
              <motion.div
                variants={fadeUp(shouldReduceMotion, 0.22)}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link href="/book-demo" className="lev-button">
                  Book a demo
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
                Lev watches your numbers continuously and sends clear alerts before GST dues, ITC
                mismatches, or cash pressure become expensive decisions.
              </motion.p>
            </motion.div>

            <motion.article
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={stagger(shouldReduceMotion, 0.1)}
              className="lev-soft-outline rounded-[30px] p-5 sm:p-6"
            >
              <div className="mx-auto max-w-[360px] rounded-[30px] border border-slate-900/15 bg-slate-950 p-4">
                <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Risk Feed
                </p>
                <motion.ul variants={stagger(shouldReduceMotion, 0.12, 0.12)} className="space-y-2.5">
                  {gstAndCashAlerts.map((alert) => (
                    <motion.li
                      key={alert}
                      variants={fadeUp(shouldReduceMotion)}
                      className="rounded-2xl border border-cyan-300/30 bg-cyan-500/14 px-3 py-3 text-sm leading-relaxed text-cyan-50"
                    >
                      {alert}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
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
                Ask finance questions at any time. Get direct, decision-ready answers.
              </motion.h2>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-xl text-lg leading-relaxed">
                Lev behaves like your always-on in-house finance lead, so founders can move faster
                without guessing through hiring plans, compliance calls, or spending decisions.
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
                3. Clear your doubts + clean books
              </motion.p>
              <motion.h2
                variants={fadeUp(shouldReduceMotion, 0.08)}
                className="mt-3 max-w-xl text-[clamp(1.9rem,4vw,3rem)] leading-[1.02] font-semibold text-slate-950"
              >
                Fast founder clarity. Audit-ready books in the background.
              </motion.h2>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-xl text-lg leading-relaxed">
                Founders no longer wait for updates to understand risk. Lev answers instantly and
                keeps books clean so month close stays predictable.
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
                Subject: Levvy Finance Update
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
            className="grid gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"
          >
            <div>
              <motion.p
                variants={fadeUp(shouldReduceMotion)}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
              >
                Integrations
              </motion.p>
              <motion.h2
                variants={fadeUp(shouldReduceMotion, 0.08)}
                className="mt-3 text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.98] font-semibold text-slate-950"
              >
                We work where your team already works.
              </motion.h2>
              <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-xl text-lg leading-relaxed">
                Lev connects to existing tools and keeps data synced quietly behind the scenes.
                Finance stays accurate and current without another dashboard to manage.
              </motion.p>
              <motion.div
                variants={stagger(shouldReduceMotion, 0.22, 0.08)}
                className="mt-7 grid gap-2.5 sm:grid-cols-2"
              >
                {integrationLogos.map((logo) => (
                  <motion.div
                    key={logo}
                    variants={fadeUp(shouldReduceMotion)}
                    className="rounded-[14px] border border-slate-900/10 bg-white px-4 py-3 text-sm font-semibold tracking-[0.01em] text-slate-700"
                  >
                    {logo}
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div variants={fadeUp(shouldReduceMotion, 0.16)} className="rounded-[26px] border border-slate-900/10 bg-white/80 p-3">
              <Image
                src="/lev-network.svg"
                alt="Lev integration network map"
                width={900}
                height={520}
                className="w-full rounded-[20px]"
              />
            </motion.div>
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
            Ready to run finance like you hired an in-house operator?
          </motion.h3>
          <motion.p variants={fadeUp(shouldReduceMotion, 0.08)} className="mt-4 max-w-2xl text-[1.05rem] text-slate-300">
            Book a 30 minute demo and see how Lev closes books on time, flags GST and cash risks,
            and answers finance questions in seconds.
          </motion.p>
          <motion.div variants={fadeUp(shouldReduceMotion, 0.14)} className="mt-7">
            <Link href="/book-demo" className="lev-button bg-white text-slate-900 hover:bg-slate-200">
              Book a demo
              {arrowIcon()}
            </Link>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}
