"use client";

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
];

function fadeUp(shouldReduceMotion: boolean, delay = 0) {
  return {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : delay,
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };
}

function stagger(shouldReduceMotion: boolean, delayChildren = 0, gap = 0.14) {
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
    <div className="pb-20">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Lev
        </Link>
        <Link
          href="/book-demo"
          className="rounded-full border border-slate-900/15 bg-slate-900 px-5 py-2 text-sm font-medium text-slate-50 transition hover:bg-slate-800"
        >
          Book a demo
        </Link>
      </header>

      <main className="mx-auto mt-8 w-full max-w-6xl px-6 sm:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger(shouldReduceMotion)}
          className="relative overflow-hidden rounded-4xl border border-slate-200/70 bg-[linear-gradient(130deg,#fffef9_0%,#f0f8ff_45%,#fffdf5_100%)] px-6 py-14 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.55)] sm:px-10 sm:py-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(2,132,199,0.18),transparent_45%)]" />
          <motion.p
            variants={fadeUp(shouldReduceMotion)}
            className="relative inline-flex rounded-full border border-teal-700/15 bg-teal-700/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-teal-900"
          >
            In-house finance hire
          </motion.p>
          <motion.h1
            variants={fadeUp(shouldReduceMotion, 0.08)}
            className="relative mt-5 max-w-3xl text-4xl leading-tight font-semibold text-slate-900 sm:text-5xl"
          >
            Finance should not be stressful. Lev runs it for you.
          </motion.h1>
          <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="relative mt-5 max-w-2xl text-lg">
            Lev is an AI finance hire that proactively flags GST and cash risks, keeps your
            books clean, and answers your questions 24/7.
          </motion.p>
          <motion.div
            variants={fadeUp(shouldReduceMotion, 0.24)}
            className="relative mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/book-demo"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Book a demo
            </Link>
            <p className="text-sm text-slate-600">See what Lev does in the first 10 seconds.</p>
          </motion.div>
        </motion.section>

        <section className="mt-18 grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            variants={stagger(shouldReduceMotion)}
          >
            <motion.p
              variants={fadeUp(shouldReduceMotion)}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-900/75"
            >
              Proactively flags GST and cash risks
            </motion.p>
            <motion.h2
              variants={fadeUp(shouldReduceMotion, 0.08)}
              className="mt-3 text-3xl leading-tight font-semibold text-slate-900 sm:text-4xl"
            >
              Know what is about to hurt cash before it does.
            </motion.h2>
            <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 text-lg">
              SMBs often discover GST dues, ITC issues, and cash crunches only after damage is
              done. Lev monitors your finance stack continuously and alerts you before issues get
              expensive.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger(shouldReduceMotion, 0.14)}
            className="rounded-3xl border border-slate-200/70 bg-slate-950 p-5 shadow-[0_30px_70px_-52px_rgba(2,132,199,0.8)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Lev Risk Feed
              </p>
              <span className="rounded-full border border-cyan-200/25 bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold tracking-wide text-cyan-100">
                Live
              </span>
            </div>
            <motion.ul
              variants={stagger(shouldReduceMotion, 0.1)}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {gstAndCashAlerts.map((alert) => (
                <motion.li
                  key={alert}
                  variants={fadeUp(shouldReduceMotion)}
                  className="flex items-start gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-3 text-sm text-cyan-50"
                >
                  <span className="mt-[6px] h-2 w-2 rounded-full bg-cyan-300" />
                  <span>{alert}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </section>

        <section className="mt-18 grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            variants={stagger(shouldReduceMotion)}
            className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(140deg,#f8fafc_0%,#eef2ff_100%)] p-6 shadow-[0_25px_60px_-50px_rgba(15,23,42,0.9)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-900/80">
              24/7 finance operator
            </p>
            <motion.ul variants={stagger(shouldReduceMotion, 0.1)} className="mt-4 space-y-3">
              {chatSimulation.map((entry, index) => (
                <motion.li
                  key={`${entry.role}-${index}`}
                  variants={fadeUp(shouldReduceMotion)}
                  className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    entry.role === "founder"
                      ? "ml-auto border border-slate-300 bg-white text-slate-700"
                      : "border border-sky-900/20 bg-sky-950 text-sky-50"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">
                    {entry.role === "founder" ? "You" : "Lev"}
                  </p>
                  <p>{entry.message}</p>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={stagger(shouldReduceMotion)}
          >
            <motion.p
              variants={fadeUp(shouldReduceMotion)}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-900/75"
            >
              A dedicated finance hire working 24/7
            </motion.p>
            <motion.h2
              variants={fadeUp(shouldReduceMotion, 0.08)}
              className="mt-3 text-3xl leading-tight font-semibold text-slate-900 sm:text-4xl"
            >
              Ask hard finance questions. Get operator-level answers in seconds.
            </motion.h2>
            <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 text-lg">
              Most SMBs need finance leadership but cannot hire full time yet. Lev gives you
              always-on decision support so hiring, spending, and compliance calls are made with
              confidence.
            </motion.p>
          </motion.div>
        </section>

        <section className="mt-18 grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            variants={stagger(shouldReduceMotion)}
          >
            <motion.p
              variants={fadeUp(shouldReduceMotion)}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-900/80"
            >
              Clear doubts and keep books clean
            </motion.p>
            <motion.h2
              variants={fadeUp(shouldReduceMotion, 0.08)}
              className="mt-3 text-3xl leading-tight font-semibold text-slate-900 sm:text-4xl"
            >
              Clarity for founders. Audit-ready books for your team.
            </motion.h2>
            <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 text-lg">
              Founders should not wait on replies to know where the business stands. Lev answers
              instantly and keeps your books clean so month close stays on track.
            </motion.p>
          </motion.div>

          <motion.article
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            variants={stagger(shouldReduceMotion, 0.08)}
            className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(145deg,#fbfffd_0%,#eefcf7_70%)] p-6 shadow-[0_28px_70px_-55px_rgba(13,148,136,0.95)]"
          >
            <motion.p variants={fadeUp(shouldReduceMotion)} className="text-xs font-semibold text-slate-500">
              Subject: Levvy Finance Update
            </motion.p>
            <motion.p variants={fadeUp(shouldReduceMotion, 0.08)} className="mt-4 text-sm text-slate-700">
              Your daily operations digest is ready:
            </motion.p>
            <motion.ul variants={stagger(shouldReduceMotion, 0.16)} className="mt-4 space-y-3">
              {financeUpdateBullets.map((lineItem) => (
                <motion.li
                  key={lineItem}
                  variants={fadeUp(shouldReduceMotion)}
                  className="rounded-2xl border border-teal-700/15 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  {lineItem}
                </motion.li>
              ))}
            </motion.ul>
          </motion.article>
        </section>

        <section className="mt-18 rounded-4xl border border-slate-200/70 bg-[linear-gradient(130deg,#f8fafc_0%,#f0fdfa_100%)] px-6 py-10 sm:px-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger(shouldReduceMotion)}
          >
            <motion.h2
              variants={fadeUp(shouldReduceMotion)}
              className="text-3xl leading-tight font-semibold text-slate-900 sm:text-4xl"
            >
              We work where you already are.
            </motion.h2>
            <motion.p variants={fadeUp(shouldReduceMotion, 0.08)} className="mt-4 max-w-3xl text-lg">
              Lev connects directly to the tools you already use and keeps everything synced in
              the background. Instead of another finance dashboard to babysit, your team gets
              accurate numbers and clear actions right inside existing workflows.
            </motion.p>

            <motion.div
              variants={stagger(shouldReduceMotion, 0.15, 0.1)}
              className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {integrationLogos.map((logo) => (
                <motion.div
                  key={logo}
                  variants={fadeUp(shouldReduceMotion)}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 text-center text-sm font-semibold tracking-wide text-slate-700"
                >
                  {logo}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.45 }}
          variants={stagger(shouldReduceMotion)}
          className="mt-14 rounded-4xl border border-slate-200/70 bg-slate-900 px-6 py-10 text-slate-100 shadow-[0_35px_80px_-55px_rgba(15,23,42,1)] sm:px-10"
        >
          <motion.h3 variants={fadeUp(shouldReduceMotion)} className="text-2xl font-semibold sm:text-3xl">
            Ready to run finance like you hired an in-house operator?
          </motion.h3>
          <motion.p variants={fadeUp(shouldReduceMotion, 0.08)} className="mt-3 max-w-2xl text-slate-300">
            Book a 30 minute demo and we will show how Lev closes your books, flags GST and cash
            risks, and gives fast answers your team can act on.
          </motion.p>
          <motion.div variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-7">
            <Link
              href="/book-demo"
              className="inline-flex rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
            >
              Book a demo
            </Link>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}
