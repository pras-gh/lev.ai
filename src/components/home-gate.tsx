"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { LandingPage } from "@/components/landing-page";

const MAINTENANCE_START_MS = 1771874099000;
const MAINTENANCE_DURATION_MS = 24 * 60 * 60 * 1000;
const MAINTENANCE_END_MS = MAINTENANCE_START_MS + MAINTENANCE_DURATION_MS;

type Countdown = {
  hours: string;
  minutes: string;
  seconds: string;
  totalMs: number;
};

function getCountdown(): Countdown {
  const totalMs = Math.max(0, MAINTENANCE_END_MS - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    totalMs,
  };
}

function TimerUnit({
  label,
  value,
  shouldReduceMotion,
}: {
  label: string;
  value: string;
  shouldReduceMotion: boolean;
}) {
  return (
    <div className="min-w-[96px] rounded-2xl border border-white/16 bg-white/6 px-4 py-3 text-center">
      <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">{label}</p>
      <div className="relative h-9 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={value}
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center text-3xl font-semibold tracking-[-0.04em] text-white"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function HomeGate() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [countdown, setCountdown] = useState<Countdown>(() => getCountdown());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (countdown.totalMs <= 0) {
    return <LandingPage />;
  }

  const progress = (countdown.totalMs / MAINTENANCE_DURATION_MS) * 100;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050608] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,234,100,0.08),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(0,234,100,0.06),transparent_30%),linear-gradient(180deg,#040506_0%,#050608_52%,#040506_100%)]" />
        <div className="absolute inset-0 opacity-35 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_76px)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-[920px] items-center justify-center px-6 py-20">
        <div className="w-full rounded-[32px] border border-white/14 bg-[linear-gradient(160deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_100%)] p-7 shadow-[0_36px_90px_-58px_rgba(0,0,0,0.92)] backdrop-blur-xl sm:p-10">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/16 bg-white/6 px-4 py-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/16 bg-black/55">
              <BrandMark compact className="text-[0.86rem]" />
            </span>
            <BrandMark className="text-[1.2rem]" />
          </div>

          <h1 className="text-[clamp(2rem,5vw,3.3rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-white">
            trai\ is taking a short break
          </h1>
          <p className="mt-4 max-w-2xl text-[clamp(1rem,2.2vw,1.22rem)] leading-relaxed text-slate-300">
            to deliver a stronger experience tomorrow.
          </p>

          <div className="mt-10">
            <div className="flex flex-wrap gap-3">
              <TimerUnit label="Hours" value={countdown.hours} shouldReduceMotion={shouldReduceMotion} />
              <TimerUnit label="Minutes" value={countdown.minutes} shouldReduceMotion={shouldReduceMotion} />
              <TimerUnit label="Seconds" value={countdown.seconds} shouldReduceMotion={shouldReduceMotion} />
            </div>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full border border-white/12 bg-white/6">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#00ea64_0%,#1cd67a_100%)]"
                animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                transition={{ duration: 0.8, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
