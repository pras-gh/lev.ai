"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
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
    <div className="relative min-h-screen overflow-x-clip pb-18 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(34,197,94,0.05),transparent_40%),radial-gradient(circle_at_88%_12%,rgba(21,128,61,0.03),transparent_34%),linear-gradient(180deg,#010202_0%,#020303_54%,#030403_100%)]" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1220px] items-center justify-between px-6 py-4 sm:px-8">
          <Link href="/" aria-label="trai\\ home">
            <BrandMark className="text-[1.1rem] font-semibold tracking-[-0.02em] text-white" />
          </Link>
          <Link href="/" className="lev-button lev-button--outline">
            Back to home
            {arrowIcon()}
          </Link>
        </div>
      </header>

      <main className="relative mx-auto mt-26 w-full max-w-[1220px] px-6 sm:px-8 sm:mt-28">
        <motion.section
          initial="hidden"
          animate="visible"
          className="glass-panel rounded-[30px] border border-white/12 px-6 py-8 sm:px-9 sm:py-10"
        >
          <motion.p
            variants={fadeUp(shouldReduceMotion)}
            className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200"
          >
            Get trai\
          </motion.p>
          <motion.h1
            variants={fadeUp(shouldReduceMotion, 0.08)}
            className="mt-4 text-[clamp(2.2rem,5vw,4rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-white"
          >
            Schedule a 30 min call with <BrandMark compact className="text-white" />
          </motion.h1>
          <motion.p variants={fadeUp(shouldReduceMotion, 0.16)} className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            We will show how trai\ closes your books, flags GST and cash risk early, and acts like
            your in-house finance hire.
          </motion.p>
        </motion.section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.36fr_0.64fr] lg:items-start">
          <motion.article
            initial="hidden"
            animate="visible"
            variants={fadeUp(shouldReduceMotion)}
            className="glass-panel rounded-[24px] border border-white/12 p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Co-Founder</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-white">{siteConfig.founderName}</p>
                <p className="text-sm text-slate-300">{siteConfig.founderRole}</p>
              </div>
              <a
                href={siteConfig.founderLinkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${siteConfig.founderName} LinkedIn profile`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-slate-100 transition hover:border-white/35 hover:bg-white/18"
              >
                {linkedInIcon()}
              </a>
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-300">
              <p>- Live walkthrough of trai\ workflows</p>
              <p>- Setup for your current integrations</p>
              <p>- Exact scope for your team</p>
            </div>
          </motion.article>

          <motion.section
            initial="hidden"
            animate="visible"
            variants={fadeUp(shouldReduceMotion, 0.08)}
            className="glass-panel rounded-[24px] border border-white/12 p-4 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-200">Meeting duration</p>
              <div className="flex rounded-full border border-white/20 bg-white/8 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedDuration("30")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selectedDuration === "30"
                      ? "bg-emerald-300 text-emerald-950"
                      : "text-slate-200 hover:text-white"
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
                      ? "bg-emerald-300 text-emerald-950"
                      : "text-slate-200 hover:text-white"
                  } ${!has15MinuteLink ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  15 min
                </button>
              </div>
            </div>

            {has30MinuteLink ? (
              <iframe
                title="Get trai\\ call"
                src={selectedBookingUrl}
                width="100%"
                height="760"
                loading="lazy"
                className="h-[760px] w-full rounded-[18px] border border-white/16 bg-white"
              />
            ) : (
              <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-5 text-sm text-amber-100">
                <p className="font-semibold">Cal.com setup required</p>
                <p className="mt-2 text-amber-100/90">
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
          <div className="flex items-center justify-between border-t border-white/12 pt-5 text-sm">
            <p className="font-medium text-slate-400">© 2026 <BrandMark compact className="text-slate-300" /></p>
            <Link href="/get-trail" className="text-slate-300 transition hover:text-white">
              Book Demo
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
