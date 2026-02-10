"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { isCalComUrl, normalizeBookingUrl, siteConfig } from "@/lib/site-config";

type Duration = "30" | "15";

function fadeUp(shouldReduceMotion: boolean, delay = 0) {
  return {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 18,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : delay,
        duration: shouldReduceMotion ? 0 : 0.56,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };
}

function linkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M6.94 8.24a1.44 1.44 0 110-2.88 1.44 1.44 0 010 2.88zM5.64 9.6h2.6v8.75h-2.6V9.6zM9.88 9.6h2.49v1.2h.03c.35-.66 1.2-1.35 2.47-1.35 2.64 0 3.13 1.74 3.13 4v4.9h-2.6V14c0-1.03-.02-2.35-1.43-2.35-1.43 0-1.65 1.11-1.65 2.27v4.43h-2.44V9.6z"
        fill="currentColor"
      />
    </svg>
  );
}

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

export function BookDemoPage() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [selectedDuration, setSelectedDuration] = useState<Duration>("30");

  const has30MinuteLink = isCalComUrl(siteConfig.calcom30MinUrl);
  const has15MinuteLink = isCalComUrl(siteConfig.calcom15MinUrl);

  const selectedBookingUrl = useMemo(() => {
    if (selectedDuration === "15" && has15MinuteLink) {
      return normalizeBookingUrl(siteConfig.calcom15MinUrl);
    }

    return normalizeBookingUrl(siteConfig.calcom30MinUrl);
  }, [has15MinuteLink, selectedDuration]);

  return (
    <div className="relative overflow-x-clip pb-20">
      <div className="pointer-events-none absolute -left-16 top-16 h-64 w-64 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-12 h-72 w-72 rounded-full bg-blue-300/35 blur-3xl" />

      <header className="sticky top-0 z-30 border-b border-slate-900/7 bg-[rgba(247,243,235,0.82)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4 sm:px-8">
          <Link
            href="/"
            className="text-[1.08rem] font-semibold tracking-[-0.02em] text-slate-900"
            aria-label="Lev home"
          >
            Lev
          </Link>
          <Link href="/" className="lev-button lev-button--light">
            Back to home
            {arrowIcon()}
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-8 w-full max-w-[1200px] px-6 sm:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          className="lev-soft-outline relative overflow-hidden rounded-[34px] px-6 py-10 sm:px-10 sm:py-11"
        >
          <div className="lev-grid-field pointer-events-none absolute inset-0 opacity-[0.16]" />
          <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <motion.p
                variants={fadeUp(shouldReduceMotion)}
                initial="hidden"
                animate="visible"
                className="inline-flex rounded-full border border-slate-900/15 bg-white/88 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"
              >
                Get Lev
              </motion.p>
              <motion.h1
                variants={fadeUp(shouldReduceMotion, 0.08)}
                initial="hidden"
                animate="visible"
                className="mt-4 text-[clamp(2.2rem,5vw,4rem)] leading-[0.96] font-semibold tracking-[-0.03em] text-slate-950"
              >
                <span className="block">Schedule a 30 min call</span>
                <span className="lev-highlight block">with Lev</span>
              </motion.h1>
              <motion.p
                variants={fadeUp(shouldReduceMotion, 0.16)}
                initial="hidden"
                animate="visible"
                className="mt-4 max-w-xl text-lg leading-relaxed"
              >
                We will show how Lev closes your books and proactively flags GST and cash risks.
              </motion.p>
            </div>

            <motion.div
              variants={fadeUp(shouldReduceMotion, 0.2)}
              initial="hidden"
              animate="visible"
              className="rounded-[26px] border border-slate-900/10 bg-white/86 p-3"
            >
              <Image
                src="/lev-network.svg"
                alt="Lev operations overview visual"
                width={900}
                height={520}
                className="w-full rounded-[18px]"
              />
            </motion.div>
          </div>
        </motion.section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.38fr_0.62fr] lg:items-start">
          <motion.article
            initial="hidden"
            animate="visible"
            variants={fadeUp(shouldReduceMotion)}
            className="lev-soft-outline rounded-[28px] p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Founder</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-slate-900">{siteConfig.founderName}</p>
                <p className="text-sm text-slate-600">{siteConfig.founderRole}</p>
              </div>
              <a
                href={siteConfig.founderLinkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${siteConfig.founderName} LinkedIn profile`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              >
                {linkedInIcon()}
              </a>
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-600">
              <p>- Live walkthrough of Lev workflows</p>
              <p>- How alerts + close process run weekly</p>
              <p>- Exact setup for your current tools</p>
            </div>
          </motion.article>

          <motion.section
            initial="hidden"
            animate="visible"
            variants={fadeUp(shouldReduceMotion, 0.08)}
            className="lev-soft-outline rounded-[28px] p-4 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-700">Meeting duration</p>
              <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedDuration("30")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selectedDuration === "30"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  30 min
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDuration("15")}
                  disabled={!has15MinuteLink}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selectedDuration === "15"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  } ${!has15MinuteLink ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  15 min
                </button>
              </div>
            </div>

            {has30MinuteLink ? (
              <iframe
                title="Get Lev call"
                src={selectedBookingUrl}
                width="100%"
                height="760"
                loading="lazy"
                className="h-[760px] w-full rounded-[18px] border border-slate-200 bg-white"
              />
            ) : (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                <p className="font-semibold">Cal.com setup required</p>
                <p className="mt-2 text-amber-800">
                  Add your Cal.com links to the environment file before launch.
                </p>
                <div className="mt-3 space-y-1 font-mono text-[12px]">
                  <p>NEXT_PUBLIC_CALCOM_30MIN_URL=...</p>
                  <p>NEXT_PUBLIC_CALCOM_15MIN_URL=...</p>
                </div>
              </div>
            )}
          </motion.section>
        </section>

        <footer className="mt-10 pb-2">
          <div className="flex items-center justify-between border-t border-slate-900/12 pt-5 text-sm">
            <p className="font-medium text-slate-600">© 2026 Lev</p>
            <Link href="/get-lev" className="text-slate-700 transition hover:text-slate-900">
              Get Lev
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
