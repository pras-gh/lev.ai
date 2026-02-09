"use client";

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
        duration: shouldReduceMotion ? 0 : 0.52,
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
    <div className="pb-16">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Lev
        </Link>
        <Link
          href="/"
          className="rounded-full border border-slate-900/15 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900/25 hover:text-slate-900"
        >
          Back to home
        </Link>
      </header>

      <main className="mx-auto mt-10 w-full max-w-6xl px-6 sm:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          className="rounded-4xl border border-slate-200/70 bg-[linear-gradient(120deg,#fffef9_0%,#f0fdf4_100%)] px-6 py-12 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.7)] sm:px-10"
        >
          <motion.h1
            variants={fadeUp(shouldReduceMotion)}
            className="max-w-2xl text-4xl leading-tight font-semibold text-slate-900 sm:text-5xl"
          >
            Schedule a 30 min call with Levvy
          </motion.h1>
          <motion.p variants={fadeUp(shouldReduceMotion, 0.1)} className="mt-4 max-w-2xl text-lg">
            We will show how Levvy closes your books and proactively flags GST and cash risks.
          </motion.p>
        </motion.section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.38fr_0.62fr] lg:items-start">
          <motion.article
            initial="hidden"
            animate="visible"
            variants={fadeUp(shouldReduceMotion)}
            className="rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-[0_24px_60px_-50px_rgba(15,23,42,0.75)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Founder
            </p>
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
          </motion.article>

          <motion.section
            initial="hidden"
            animate="visible"
            variants={fadeUp(shouldReduceMotion, 0.08)}
            className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_24px_60px_-52px_rgba(15,23,42,0.8)] sm:p-6"
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
                title="Book a demo with Lev"
                src={selectedBookingUrl}
                width="100%"
                height="760"
                loading="lazy"
                className="h-[760px] w-full rounded-2xl border border-slate-200"
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
      </main>
    </div>
  );
}
