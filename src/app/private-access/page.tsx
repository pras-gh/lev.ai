"use client";

import Link from "next/link";
import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { normalizeBookingUrl, siteConfig } from "@/lib/site-config";

export default function PrivateAccessPage() {
  const bookDemoUrl = normalizeBookingUrl(siteConfig.calcom30MinUrl);

  useEffect(() => {
    void signOut({ redirect: false });
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[960px] px-6 py-24 sm:px-8">
      <section className="glass-panel rounded-[26px] border border-white/12 p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">Private Access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">Access is currently restricted</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
          Your session was signed out because this email is not on an active access plan.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href={bookDemoUrl} className="lev-button lev-button--hero-dark">
            Book demo for early access
          </a>
          <Link href="/" className="lev-button lev-button--outline">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
